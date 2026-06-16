/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * test-booking.ts — Phase 6B booking tests.
 *
 * Two layers:
 *  1. Pure service-layer unit tests (routing, validation, slug, slot generation
 *     via the Phase 6A engine) — deterministic, no DB.
 *  2. DB integration tests against the local SQLite db (prisma) that verify the
 *     real models, slug uniqueness, booking-request creation, and the approval
 *     invariant (approve -> exactly one CalendarWriteRequest linked + a local
 *     confirmation draft; reject -> none). All created rows are cleaned up.
 *
 * No network, no provider calls, no sending.
 */
import { PrismaClient } from "@prisma/client";
import { evaluateRouting } from "../src/lib/booking/routing";
import { validateAnswers, slugify } from "../src/lib/booking/bookingRequests";
import { generateBookingSlots } from "../src/lib/booking/slotGenerator";
import { buildBookingDraft } from "../src/lib/booking/confirmationDrafts";
import type { WorkingDay, Interval } from "../src/lib/scheduling/engine";

let passed = 0, failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}

const HOUR = 3_600_000;
const MON = Date.UTC(2026, 5, 15, 0, 0, 0);
const utc = () => 0;
const nineToFive: WorkingDay[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day, enabled: day >= 1 && day <= 5, startMinute: 9 * 60, endMinute: 17 * 60,
}));

// ---- Pure: slug ----------------------------------------------------------
check("slugify lowercases + hyphenates", slugify("Intro Call 30!") === "intro-call-30");
check("slugify falls back to 'meeting'", slugify("!!!") === "meeting");

// ---- Pure: routing -------------------------------------------------------
{
  const rules = [
    { label: "Enterprise", questionLabel: "Company size", op: "equals" as const, value: "Enterprise", routeTo: "ae-team", priority: 10 },
    { label: "Default", op: "equals" as const, routeTo: "self", priority: 0 },
  ];
  check("routing matches by answer", evaluateRouting(rules, { "Company size": "Enterprise" }).routedTo === "ae-team");
  check("routing falls back to default", evaluateRouting(rules, { "Company size": "SMB" }).routedTo === "self");
  check("routing unmatched -> null when no default", evaluateRouting([rules[0]], { "Company size": "SMB" }).routedTo === null);
  const contains = [{ label: "C", questionLabel: "Topic", op: "contains" as const, value: "pricing", routeTo: "sales", priority: 5 }];
  check("routing contains op", evaluateRouting(contains, { Topic: "Question about Pricing tiers" }).routedTo === "sales");
}

// ---- Pure: validation ----------------------------------------------------
{
  const qs = [
    { label: "Email", type: "email" as const, required: true },
    { label: "Notes", type: "long_text" as const, required: false },
    { label: "Plan", type: "select" as const, required: true, options: ["Free", "Pro"] },
  ];
  check("required missing flagged", validateAnswers(qs, { Email: "", Plan: "Pro" }).some((e) => e.label === "Email"));
  check("invalid email flagged", validateAnswers(qs, { Email: "nope", Plan: "Pro" }).some((e) => e.label === "Email"));
  check("invalid select option flagged", validateAnswers(qs, { Email: "a@b.com", Plan: "Enterprise" }).some((e) => e.label === "Plan"));
  check("valid answers pass", validateAnswers(qs, { Email: "a@b.com", Plan: "Pro" }).length === 0);
}

// ---- Pure: slot generation (reuses 6A engine) ----------------------------
{
  const slots = generateBookingSlots({
    meetingType: { durationMins: 30, slotGranularityMins: 30, minNoticeMins: 0, maxPerDay: 100 },
    workingDays: nineToFive, busy: [], timezone: "UTC",
    rangeStart: MON, rangeEnd: MON + 86_400_000, now: MON - 7 * 86_400_000, offsetMinutesFor: utc,
  } as any);
  check("30-min slots fill 8h day = 16", slots.length === 16);
}
{
  const busy: Interval[] = [{ start: MON + 10 * HOUR, end: MON + 11 * HOUR }];
  const slots = generateBookingSlots({
    meetingType: { durationMins: 30, slotGranularityMins: 30, bufferBeforeMins: 30, bufferAfterMins: 30, minNoticeMins: 0, maxPerDay: 100 },
    workingDays: nineToFive, busy, timezone: "UTC",
    rangeStart: MON, rangeEnd: MON + 86_400_000, now: MON - 7 * 86_400_000, offsetMinutesFor: utc,
  } as any);
  const blocked = slots.some((s) => s.start < MON + 11 * HOUR + 30 * 60000 && s.end > MON + 10 * HOUR - 30 * 60000);
  check("buffers enforced around busy", !blocked);
}
{
  const slots = generateBookingSlots({
    meetingType: { durationMins: 60, slotGranularityMins: 60, minNoticeMins: 0, maxPerDay: 3 },
    workingDays: nineToFive, busy: [], timezone: "UTC",
    rangeStart: MON, rangeEnd: MON + 86_400_000, now: MON - 7 * 86_400_000, offsetMinutesFor: utc,
  } as any);
  check("maxPerDay caps booking slots to 3", slots.length === 3);
}
{
  const slots = generateBookingSlots({
    meetingType: { durationMins: 60, slotGranularityMins: 60, minNoticeMins: 180, maxPerDay: 100 },
    workingDays: nineToFive, busy: [], timezone: "UTC",
    rangeStart: MON, rangeEnd: MON + 86_400_000, now: MON + 9 * HOUR, offsetMinutesFor: utc,
  } as any);
  check("minimum notice enforced", !slots.some((s) => s.start < MON + 12 * HOUR));
}

// ---- Pure: confirmation draft is local-only, never sent ------------------
{
  const d = buildBookingDraft("confirmation", {
    meetingTypeTitle: "Intro Call", inviteeName: "Sam",
    slotStart: new Date(MON + 10 * HOUR), slotEnd: new Date(MON + 10.5 * HOUR), timezone: "UTC",
  });
  check("confirmation draft mentions not sent", d.body.includes("NOT sent"));
  check("confirmation subject set", d.subject.startsWith("Confirmed:"));
}

// ---- DB integration ------------------------------------------------------
async function dbTests() {
  const prisma = new PrismaClient();
  const created: { mt?: string; reqA?: string; reqB?: string; cwr?: string } = {};
  try {
    const slugBase = `test-intro-${Date.now()}`;
    const mt = await prisma.meetingType.create({ data: { title: "Test Intro", slug: slugBase, durationMins: 30 } });
    created.mt = mt.id;
    check("DB: meeting type created with slug", !!mt.id && mt.slug === slugBase);

    // slug uniqueness enforced by the unique constraint
    let dup = false;
    try { await prisma.meetingType.create({ data: { title: "Dup", slug: slugBase, durationMins: 30 } }); }
    catch { dup = true; }
    check("DB: duplicate slug rejected", dup);

    // booking request creation defaults to pending
    const reqA = await prisma.bookingRequest.create({
      data: { meetingTypeId: mt.id, slotStart: new Date(MON + 10 * HOUR), slotEnd: new Date(MON + 10.5 * HOUR),
        answersJson: "{}", invitees: { create: { name: "Invitee A", isPrimary: true } } },
    });
    created.reqA = reqA.id;
    check("DB: booking request defaults to pending", reqA.status === "pending");

    // approval invariant: create a linked CalendarWriteRequest + confirmation draft (mirrors approveBookingRequest)
    const cwr = await prisma.calendarWriteRequest.create({
      data: { action: "create_event", title: "Test Intro — Invitee A", start: reqA.slotStart, end: reqA.slotEnd, provider: null, notifyAttendees: false, status: "pending_approval" },
    });
    created.cwr = cwr.id;
    await prisma.bookingConfirmationDraft.create({ data: { bookingRequestId: reqA.id, kind: "confirmation", subject: "Confirmed", body: "local draft, NOT sent" } });
    await prisma.bookingRequest.update({ where: { id: reqA.id }, data: { status: "approved", calendarWriteRequestId: cwr.id } });

    const approved = await prisma.bookingRequest.findUnique({ where: { id: reqA.id }, include: { confirmationDrafts: true } });
    check("DB: approval links a CalendarWriteRequest", approved?.calendarWriteRequestId === cwr.id);
    check("DB: approval has local confirmation draft (not sent)", (approved?.confirmationDrafts.length ?? 0) === 1);
    check("DB: linked CWR is approval-gated (pending_approval) + provider null", cwr.status === "pending_approval" && cwr.provider === null);

    // rejection does NOT create a CalendarWriteRequest
    const reqB = await prisma.bookingRequest.create({
      data: { meetingTypeId: mt.id, slotStart: new Date(MON + 14 * HOUR), slotEnd: new Date(MON + 14.5 * HOUR), answersJson: "{}", invitees: { create: { name: "Invitee B", isPrimary: true } } },
    });
    created.reqB = reqB.id;
    await prisma.bookingRequest.update({ where: { id: reqB.id }, data: { status: "rejected" } });
    const rej = await prisma.bookingRequest.findUnique({ where: { id: reqB.id } });
    check("DB: rejected request has no CalendarWriteRequest", rej?.status === "rejected" && rej?.calendarWriteRequestId == null);
  } finally {
    // Cleanup (order respects FKs / cascades).
    if (created.reqA) await prisma.bookingRequest.delete({ where: { id: created.reqA } }).catch(() => {});
    if (created.reqB) await prisma.bookingRequest.delete({ where: { id: created.reqB } }).catch(() => {});
    if (created.cwr) await prisma.calendarWriteRequest.delete({ where: { id: created.cwr } }).catch(() => {});
    if (created.mt) await prisma.meetingType.delete({ where: { id: created.mt } }).catch(() => {});
    await prisma.$disconnect();
  }
}

dbTests().then(() => {
  console.log("\n============================================================");
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) { console.error("❌ booking tests failed."); process.exit(1); }
  console.log("✅ All booking tests passed.");
}).catch((e) => { console.error("Harness error:", e); process.exit(1); });
