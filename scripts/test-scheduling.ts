/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * test-scheduling.ts — unit tests for the Phase 6A availability engine.
 *
 * Pure-function tests with a fixed timezone offset so results are deterministic
 * and independent of the host clock/tz database. No DB, no network, no provider
 * calls, no sending.
 */
import {
  computeFreeSlots,
  detectConflicts,
  meetingLoadHours,
  workingWindows,
  buildCalendarWritePreview,
  type WorkingDay,
  type Interval,
} from "../src/lib/scheduling/engine";

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) { passed++; console.log(`PASS ${name}`); }
  else { failed++; console.log(`FAIL ${name}`); }
}

const MIN = 60_000;
const HOUR = 3_600_000;
// A fixed UTC reference Monday 2026-06-15 00:00:00 UTC.
const MON = Date.UTC(2026, 5, 15, 0, 0, 0);
const utc = () => 0; // fixed offset: local == UTC

// Mon–Fri 9:00–17:00 working hours.
const nineToFive: WorkingDay[] = [0, 1, 2, 3, 4, 5, 6].map((day) => ({
  day,
  enabled: day >= 1 && day <= 5,
  startMinute: 9 * 60,
  endMinute: 17 * 60,
}));

const base = {
  workingDays: nineToFive,
  timezone: "UTC",
  offsetMinutesFor: utc,
  now: MON - 7 * 86_400_000, // a week earlier, so minNotice never blocks
  slotGranularityMins: 30,
};

// 1. Working windows: a single weekday yields one 8h window.
{
  const w = workingWindows({
    ...base, durationMins: 30, busy: [],
    rangeStart: MON, rangeEnd: MON + 86_400_000,
  } as any);
  check("working window is the 9-17 block", w.length === 1 && w[0].start === MON + 9 * HOUR && w[0].end === MON + 17 * HOUR);
}

// 2. Free slots: empty day, 60-min meeting, 60-min granularity → 8 slots (9..16 starts).
{
  const slots = computeFreeSlots({
    ...base, durationMins: 60, slotGranularityMins: 60, busy: [],
    rangeStart: MON, rangeEnd: MON + 86_400_000,
  } as any);
  check("empty 8h day yields 8 hourly slots", slots.length === 8);
  check("first slot starts at 09:00", slots.some((s) => s.start === MON + 9 * HOUR));
}

// 3. Busy interval removes overlapping slots.
{
  const busy: Interval[] = [{ start: MON + 10 * HOUR, end: MON + 12 * HOUR }];
  const slots = computeFreeSlots({
    ...base, durationMins: 60, slotGranularityMins: 60, busy,
    rangeStart: MON, rangeEnd: MON + 86_400_000,
  } as any);
  const overlaps = slots.some((s) => s.start < MON + 12 * HOUR && s.end > MON + 10 * HOUR);
  check("busy block removes overlapping slots", !overlaps && slots.length === 6);
}

// 4. Buffers expand busy: 30-min buffer each side around a 10-11 meeting blocks 9:30-11:30.
{
  const busy: Interval[] = [{ start: MON + 10 * HOUR, end: MON + 11 * HOUR }];
  const slots = computeFreeSlots({
    ...base, durationMins: 60, slotGranularityMins: 30, busy,
    bufferBeforeMins: 30, bufferAfterMins: 30,
    rangeStart: MON, rangeEnd: MON + 86_400_000,
  } as any);
  const blocked = slots.some((s) => s.start < MON + 11 * HOUR + 30 * MIN && s.end > MON + 9 * HOUR + 30 * MIN);
  check("buffers expand busy window", !blocked);
}

// 5. Lunch protection (modeled as busy) removes the noon hour.
{
  const lunch: Interval[] = [{ start: MON + 12 * HOUR, end: MON + 13 * HOUR }];
  const slots = computeFreeSlots({
    ...base, durationMins: 60, slotGranularityMins: 60, busy: lunch,
    rangeStart: MON, rangeEnd: MON + 86_400_000,
  } as any);
  check("lunch hour protected", !slots.some((s) => s.start === MON + 12 * HOUR));
}

// 6. Conflict detection.
{
  const busy: Interval[] = [{ start: MON + 14 * HOUR, end: MON + 15 * HOUR }];
  const c1 = detectConflicts({ start: MON + 14 * HOUR + 30 * MIN, end: MON + 15 * HOUR + 30 * MIN }, busy);
  const c2 = detectConflicts({ start: MON + 16 * HOUR, end: MON + 17 * HOUR }, busy);
  check("overlapping proposal flags conflict", c1.length === 1);
  check("non-overlapping proposal has no conflict", c2.length === 0);
}

// 7. minNotice blocks slots that are too soon.
{
  const slots = computeFreeSlots({
    ...base, durationMins: 60, slotGranularityMins: 60, busy: [],
    now: MON + 9 * HOUR, minNoticeMins: 180, // 3h notice → first usable start 12:00
    rangeStart: MON, rangeEnd: MON + 86_400_000,
  } as any);
  check("minNotice blocks early slots", !slots.some((s) => s.start < MON + 12 * HOUR));
}

// 8. maxPerDay caps slots.
{
  const slots = computeFreeSlots({
    ...base, durationMins: 60, slotGranularityMins: 60, busy: [], maxPerDay: 3,
    rangeStart: MON, rangeEnd: MON + 86_400_000,
  } as any);
  check("maxPerDay caps to 3", slots.length === 3);
}

// 9. meetingLoadHours.
{
  const busy: Interval[] = [
    { start: MON + 9 * HOUR, end: MON + 10 * HOUR },
    { start: MON + 13 * HOUR, end: MON + 14.5 * HOUR },
  ];
  const load = meetingLoadHours(busy, { start: MON + 9 * HOUR, end: MON + 17 * HOUR });
  check("meeting load = 2.5h", Math.abs(load - 2.5) < 1e-6);
}

// 10. Timezone projection: +120 offset shifts the UTC window earlier by 2h.
{
  const w = workingWindows({
    ...base, durationMins: 30, busy: [], offsetMinutesFor: () => 120,
    rangeStart: MON - 86_400_000, rangeEnd: MON + 2 * 86_400_000,
  } as any);
  // 09:00 local at +120 == 07:00 UTC on the same local date.
  const monday = w.find((iv) => Math.abs(iv.start - (MON + 7 * HOUR)) < 1000);
  check("tz offset shifts working window to 07:00 UTC", !!monday);
}

// 11. Weekend excluded (Sat MON+5d, Sun MON+6d disabled).
{
  const sat = MON + 5 * 86_400_000;
  const slots = computeFreeSlots({
    ...base, durationMins: 60, slotGranularityMins: 60, busy: [],
    rangeStart: sat, rangeEnd: sat + 86_400_000,
  } as any);
  check("Saturday has no slots", slots.length === 0);
}

// 12. Write preview: provider not configured → local-only, no notifications, no write.
{
  const p = buildCalendarWritePreview({
    proposed: { start: MON + 10 * HOUR, end: MON + 11 * HOUR },
    busy: [{ start: MON + 10.5 * HOUR, end: MON + 11.5 * HOUR }],
    providerConfigured: false,
    notifyAttendees: false,
    attendeeCount: 2,
  });
  check("preview detects conflict", p.hasConflicts && p.conflicts.length === 1);
  check("preview provider unavailable when unconfigured", p.providerAvailable === false);
  check("preview defaults to no attendee notification", p.notifyAttendees === false);
  check("preview impact mentions local-only", p.impactSummary.includes("local-only"));
}

console.log("\n============================================================");
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) { console.error("❌ scheduling engine tests failed."); process.exit(1); }
console.log("✅ All scheduling engine tests passed.");
