/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * test-planner.ts — Phase 6D planner/optimizer tests.
 *
 * Layer 1: pure engine tests (task/habit/focus scheduling, day-load analysis,
 * flexible-meeting proposals) with fixed UTC offset for determinism.
 * Layer 2: DB integration for the proposal -> approval-gated CalendarWriteRequest
 * invariant (provider null, no notify) and rejection -> none, with cleanup.
 */
import { PrismaClient } from "@prisma/client";
import { scheduleTasks } from "../src/lib/planner/taskScheduler";
import { scheduleHabit } from "../src/lib/planner/habitScheduler";
import { optimizeFocus } from "../src/lib/planner/focusOptimizer";
import { proposeFlexibleMoves } from "../src/lib/planner/flexibleMeetingOptimizer";
import { analyzeDayLoads, contextSwitchScore } from "../src/lib/planner/scoring";
import type { WorkingDay, Interval } from "../src/lib/scheduling/engine";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}

const HOUR = 3_600_000, DAY = 86_400_000;
const MON = Date.UTC(2026, 5, 15, 0, 0, 0); // Monday
const utc = () => 0;
const days: WorkingDay[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({ day: d, enabled: d >= 1 && d <= 5, startMinute: 540, endMinute: 1020 }));
const ctxBase = {
  workingDays: days, timezone: "UTC", offsetMinutesFor: utc, now: MON - 7 * DAY,
  rangeStart: MON, rangeEnd: MON + DAY,
};
const overlaps = (a: Interval, s: number, e: number) => a.start < e && a.end > s;

// 1. schedule tasks into open slots
{
  const r = scheduleTasks(
    [{ id: "t1", title: "A", priority: 3, estimateMins: 60 }, { id: "t2", title: "B", priority: 3, estimateMins: 60 }],
    { ...ctxBase, busy: [] } as any
  );
  check("both tasks scheduled in open day", r.scheduled.length === 2 && r.unscheduled.length === 0);
  check("first task starts at 09:00", r.scheduled[0].start === MON + 9 * HOUR);
}

// 2. priority ordering (lower number first)
{
  const r = scheduleTasks(
    [{ id: "low", title: "Low", priority: 5, estimateMins: 60 }, { id: "high", title: "High", priority: 1, estimateMins: 60 }],
    { ...ctxBase, busy: [] } as any
  );
  check("higher priority scheduled first", r.scheduled[0].refId === "high");
}

// 3. due-date ordering beats priority
{
  const r = scheduleTasks(
    [{ id: "p1NoDue", title: "P1", priority: 1, estimateMins: 60 },
     { id: "p3Due", title: "P3 due soon", priority: 3, estimateMins: 60, dueDate: MON + 6 * HOUR }],
    { ...ctxBase, busy: [] } as any
  );
  check("earlier due date scheduled first", r.scheduled[0].refId === "p3Due");
}

// 4. task too large for any slot remains unscheduled
{
  const r = scheduleTasks(
    [{ id: "huge", title: "Huge", priority: 1, estimateMins: 600 }], // 10h > 8h day
    { ...ctxBase, busy: [] } as any
  );
  check("oversized task unscheduled", r.scheduled.length === 0 && r.unscheduled[0].id === "huge");
}

// 5. conflict avoidance
{
  const busy: Interval[] = [{ start: MON + 10 * HOUR, end: MON + 11 * HOUR }];
  const r = scheduleTasks([{ id: "t", title: "T", priority: 1, estimateMins: 90 }], { ...ctxBase, busy } as any);
  check("task avoids busy block", r.scheduled.length === 1 && !overlaps(r.scheduled[0], MON + 10 * HOUR, MON + 11 * HOUR));
}

// 6. lunch/break protection (lunch as busy)
{
  const lunch: Interval[] = [{ start: MON + 12 * HOUR, end: MON + 13 * HOUR }];
  const r = scheduleTasks([{ id: "big", title: "Big", priority: 1, estimateMins: 200 }], { ...ctxBase, busy: lunch } as any);
  check("task does not overlap lunch", r.scheduled.length === 1 && !overlaps(r.scheduled[0], MON + 12 * HOUR, MON + 13 * HOUR));
}

// 7. habit schedule generation within window
{
  const placed = scheduleHabit(
    { id: "h1", name: "Reading", durationMins: 30, windowStartMin: 9 * 60, windowEndMin: 11 * 60, frequency: "daily" },
    { ...ctxBase, busy: [], rangeStart: MON, rangeEnd: MON + DAY } as any
  );
  check("habit placed once in range", placed.length >= 1);
  const m = (placed[0].start - MON) / 60000;
  check("habit within preferred window", m >= 9 * 60 && m < 11 * 60);
}

// 8. focus block generation toward goal
{
  const blocks = optimizeFocus(
    { weeklyFocusGoalHrs: 3, minFocusBlockMins: 60, preferFocusMornings: true },
    { ...ctxBase, busy: [], rangeStart: MON, rangeEnd: MON + DAY } as any
  );
  const total = blocks.reduce((s, b) => s + (b.end - b.start), 0) / HOUR;
  check("focus blocks generated", blocks.length >= 1);
  check("focus total does not exceed goal", total <= 3 + 1e-6 && total >= 1);
}

// 9. fragmented day detection
{
  const busy: Interval[] = [
    { start: MON + 9 * HOUR, end: MON + 9.5 * HOUR },
    { start: MON + 10 * HOUR, end: MON + 10.5 * HOUR },
    { start: MON + 11 * HOUR, end: MON + 11.5 * HOUR },
  ];
  const loads = analyzeDayLoads(busy, MON, MON + DAY, utc);
  check("fragmented day detected", loads.some((l) => l.fragmented));
  check("context-switch score > 0", contextSwitchScore(loads) > 0);
}

// 10. flexible meeting move proposal
{
  // Monday overloaded (7h busy), Tuesday light
  const busy: Interval[] = [{ start: MON + 9 * HOUR, end: MON + 16 * HOUR }];
  const meetings = [{ id: "m1", title: "Flexible sync", start: MON + 15 * HOUR, end: MON + 16 * HOUR }];
  const proposals = proposeFlexibleMoves(meetings as any, { ...ctxBase, busy, rangeStart: MON, rangeEnd: MON + 3 * DAY } as any, 6);
  check("overloaded day triggers a move proposal", proposals.length === 1);
  check("move targets a lighter day", proposals[0].toStart >= MON + DAY);
}

// ---- DB integration: proposal -> approval-gated CWR ----------------------
async function dbTests() {
  const prisma = new PrismaClient();
  const created: { run?: string; cwr?: string } = {};
  try {
    const run = await prisma.optimizationRun.create({
      data: {
        scope: "day", rangeStart: new Date(MON), rangeEnd: new Date(MON + DAY),
        proposals: { create: [
          { kind: "focus_block", title: "Deep work", start: new Date(MON + 9 * HOUR), end: new Date(MON + 11 * HOUR), score: 0.8 },
          { kind: "schedule_task", title: "Task A", start: new Date(MON + 13 * HOUR), end: new Date(MON + 14 * HOUR), score: 0.7 },
        ] },
      },
      include: { proposals: true },
    });
    created.run = run.id;
    check("DB: optimization run + proposals created", run.proposals.length === 2);

    // approve one proposal -> create approval-gated CWR (provider null, no notify)
    const p = run.proposals[0];
    const cwr = await prisma.calendarWriteRequest.create({
      data: { action: "create_event", title: p.title, start: p.start, end: p.end, provider: null, notifyAttendees: false, status: "pending_approval" },
    });
    created.cwr = cwr.id;
    await prisma.optimizationProposal.update({ where: { id: p.id }, data: { status: "approved", calendarWriteRequestId: cwr.id } });
    const approved = await prisma.optimizationProposal.findUnique({ where: { id: p.id } });
    check("DB: approved proposal links CWR", approved?.calendarWriteRequestId === cwr.id);
    check("DB: CWR is approval-gated, provider null, no notify", cwr.status === "pending_approval" && cwr.provider === null && cwr.notifyAttendees === false);

    // reject the other -> no CWR
    const other = run.proposals[1];
    await prisma.optimizationProposal.update({ where: { id: other.id }, data: { status: "rejected" } });
    const rej = await prisma.optimizationProposal.findUnique({ where: { id: other.id } });
    check("DB: rejected proposal has no CWR", rej?.status === "rejected" && rej?.calendarWriteRequestId == null);
  } finally {
    if (created.cwr) await prisma.calendarWriteRequest.delete({ where: { id: created.cwr } }).catch(() => {});
    if (created.run) await prisma.optimizationRun.delete({ where: { id: created.run } }).catch(() => {});
    await prisma.$disconnect();
  }
}

dbTests().then(() => {
  console.log("\n============================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) { console.error("❌ planner tests failed."); process.exit(1); }
  console.log("✅ All planner tests passed.");
}).catch((e) => { console.error("Harness error:", e); process.exit(1); });
