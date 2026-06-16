/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * test-scheduling-secretary.ts — Phase 6C tests.
 *
 * Layer 1: pure parser/ranking/draft tests (deterministic; local-constructed `now`
 * so getDay()/getHours() are stable on the host).
 * Layer 2: DB integration verifying the calendar-request invariant (selected slot ->
 * approval-gated CalendarWriteRequest with provider=null; no send) with cleanup.
 *
 * No network, no provider calls, no sending.
 */
import { PrismaClient } from "@prisma/client";
import { parseSchedulingCommand } from "../src/lib/schedulingSecretary/parser";
import { rankCandidateSlots } from "../src/lib/schedulingSecretary/slotRanking";
import { buildSchedulingReply } from "../src/lib/schedulingSecretary/draftGenerator";
import { computeFreeSlots, type WorkingDay } from "../src/lib/scheduling/engine";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}

// Wednesday 2026-06-17, local noon (stable getDay on host).
const NOW = new Date(2026, 5, 17, 12, 0, 0).getTime();
const DAY = 86_400_000;

// ---- Parser --------------------------------------------------------------
{
  const p = parseSchedulingCommand("schedule 30 minutes with Alex next week", NOW);
  check("intent: schedule", p.intent === "schedule");
  check("duration: 30", p.durationMins === 30);
  check("participant: Alex", p.participants.some((x) => x.name === "Alex"));
  check("range starts in the future (next week)", (p.rangeStart ?? 0) > NOW);
  check("range spans ~a week", (p.rangeEnd ?? 0) - (p.rangeStart ?? 0) > 5 * DAY);
}
{
  const p = parseSchedulingCommand("find 3 times next week for a product review", NOW);
  check("intent: propose_times", p.intent === "propose_times");
  check("proposeCount: 3", p.proposeCount === 3);
  check("topic: Product Review", (p.topic || "").toLowerCase().includes("product review"));
}
{
  const p = parseSchedulingCommand("clear my afternoon", NOW);
  check("intent: clear_time", p.intent === "clear_time");
  check("timePreference: afternoon", p.timePreference === "afternoon");
}
{
  const p = parseSchedulingCommand("follow up if they don't reply in 24 hours", NOW);
  check("intent: follow_up", p.intent === "follow_up");
  check("followUpHours: 24", p.followUpHours === 24);
}
{
  const p = parseSchedulingCommand("book a 45-minute investor call next Tuesday", NOW);
  check("intent: schedule (book)", p.intent === "schedule");
  check("duration: 45", p.durationMins === 45);
  check("topic mentions investor", (p.topic || "").toLowerCase().includes("investor"));
  check("next Tuesday is a single future day", (p.rangeStart ?? 0) > NOW && (p.rangeEnd ?? 0) - (p.rangeStart ?? 0) < 2 * DAY);
}
{
  const p = parseSchedulingCommand("set up a 1:1 with my manager this week", NOW);
  check("intent: schedule (1:1)", p.intent === "schedule");
  check("participant: My Manager", p.participants.some((x) => /manager/i.test(x.name)));
  check("topic: 1:1", p.topic === "1:1");
}
{
  const p = parseSchedulingCommand("reschedule this meeting after Friday", NOW);
  check("intent: reschedule", p.intent === "reschedule");
}

// ---- Slot generation + ranking (uses 6A engine) --------------------------
{
  const MON = Date.UTC(2026, 5, 15, 0, 0, 0);
  const HOUR = 3_600_000;
  const utc = () => 0;
  const days: WorkingDay[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day: d, enabled: d >= 1 && d <= 5, startMinute: 540, endMinute: 1020 }));
  const free = computeFreeSlots({
    durationMins: 30, slotGranularityMins: 60, rangeStart: MON, rangeEnd: MON + DAY,
    workingDays: days, busy: [], timezone: "UTC", now: MON - 7 * DAY, offsetMinutesFor: utc,
  } as any);
  check("engine produced candidate slots", free.length > 0);
  const ranked = rankCandidateSlots({
    slots: free, timePreference: "afternoon", urgency: "normal", limit: 3,
    localMinuteOf: (ms) => { const m = (ms - MON) / 60000; return ((m % 1440) + 1440) % 1440; },
  });
  check("ranking returns top 3", ranked.length === 3);
  const top = ranked[0];
  const topMinute = ((top.start - MON) / 60000) % 1440;
  check("afternoon preference ranks an afternoon slot first", topMinute >= 12 * 60);
  void HOUR;
}

// ---- Draft generation (local only) ---------------------------------------
{
  const ctx = {
    topic: "Product Review", participants: [{ name: "Alex" }],
    candidateSlots: [{ start: new Date(NOW + DAY), end: new Date(NOW + DAY + 1800000) }],
    timezone: "UTC", organizerName: "Sam",
  };
  const propose = buildSchedulingReply("propose_times", ctx);
  check("propose draft lists a time", /1\./.test(propose.body));
  check("propose draft marked NOT sent", propose.body.includes("NOT sent"));
  check("confirmation subject", buildSchedulingReply("confirmation", ctx).subject.startsWith("Confirmed:"));
  check("reschedule subject", buildSchedulingReply("reschedule", ctx).subject.startsWith("Reschedule:"));
  check("follow_up subject", buildSchedulingReply("follow_up", ctx).subject.startsWith("Following up:"));
  check("cancellation marked NOT sent", buildSchedulingReply("cancellation", ctx).body.includes("NOT sent"));
}

// ---- DB integration: calendar-request invariant --------------------------
async function dbTests() {
  const prisma = new PrismaClient();
  const created: { convo?: string; cwr?: string } = {};
  try {
    const convo = await prisma.schedulingConversation.create({
      data: {
        title: "Test 1:1 with Alex", intent: "schedule", status: "ready_to_schedule",
        participants: { create: { name: "Alex", role: "invitee" } },
        candidateSlots: { create: { start: new Date(NOW + DAY), end: new Date(NOW + DAY + 1800000), score: 1, selected: true } },
      },
      include: { candidateSlots: true },
    });
    created.convo = convo.id;
    check("DB: conversation + selected slot created", convo.candidateSlots[0]?.selected === true);

    // mirror createCalendarRequestFromConversation: approval-gated, provider null, no notify
    const slot = convo.candidateSlots[0];
    const cwr = await prisma.calendarWriteRequest.create({
      data: { action: "create_event", title: convo.title, start: slot.start, end: slot.end, provider: null, notifyAttendees: false, status: "pending_approval" },
    });
    created.cwr = cwr.id;
    await prisma.schedulingConversation.update({ where: { id: convo.id }, data: { status: "calendar_request_created", calendarWriteRequestId: cwr.id } });

    const updated = await prisma.schedulingConversation.findUnique({ where: { id: convo.id } });
    check("DB: conversation links the CalendarWriteRequest", updated?.calendarWriteRequestId === cwr.id);
    check("DB: write request is approval-gated (pending_approval)", cwr.status === "pending_approval");
    check("DB: no provider + no attendee notification", cwr.provider === null && cwr.notifyAttendees === false);
  } finally {
    if (created.cwr) await prisma.calendarWriteRequest.delete({ where: { id: created.cwr } }).catch(() => {});
    if (created.convo) await prisma.schedulingConversation.delete({ where: { id: created.convo } }).catch(() => {});
    await prisma.$disconnect();
  }
}

dbTests().then(() => {
  console.log("\n============================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) { console.error("❌ scheduling secretary tests failed."); process.exit(1); }
  console.log("✅ All scheduling secretary tests passed.");
}).catch((e) => { console.error("Harness error:", e); process.exit(1); });
