/** Habit scheduler (Phase 6D). Pure + testable. */

import { computeFreeIntervals, expandDailyRules, type Interval } from "@/lib/scheduling/engine";
import { dayKey } from "./scoring";
import type { HabitInput, PlannerContext, ScheduledItem } from "./types";

const MIN_MS = 60_000;

function intersect(a: Interval[], b: Interval[]): Interval[] {
  const out: Interval[] = [];
  for (const x of a) for (const y of b) {
    const s = Math.max(x.start, y.start);
    const e = Math.min(x.end, y.end);
    if (e > s) out.push({ start: s, end: e });
  }
  return out.sort((p, q) => p.start - q.start);
}

export function scheduleHabit(habit: HabitInput, ctx: PlannerContext): ScheduledItem[] {
  const offset = ctx.offsetMinutesFor || (() => 0);
  const free = computeFreeIntervals({
    rangeStart: ctx.rangeStart, rangeEnd: ctx.rangeEnd, workingDays: ctx.workingDays,
    busy: ctx.busy, timezone: ctx.timezone, now: ctx.now, offsetMinutesFor: ctx.offsetMinutesFor,
  });

  // Preferred-window intervals for eligible days.
  const dayFilters =
    habit.frequency === "weekdays"
      ? [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startMinute: habit.windowStartMin, endMinute: habit.windowEndMin }))
      : [{ startMinute: habit.windowStartMin, endMinute: habit.windowEndMin }];
  const windows = expandDailyRules(ctx.rangeStart, ctx.rangeEnd, dayFilters, ctx.timezone, ctx.offsetMinutesFor);

  const candidates = intersect(windows, free);
  const durMs = Math.max(1, habit.durationMins) * MIN_MS;

  const placed: ScheduledItem[] = [];
  const usedDays = new Set<string>();
  const limit = habit.frequency === "weekly" ? 1 : 7;

  for (const c of candidates) {
    if (placed.length >= limit) break;
    if (c.end - c.start < durMs) continue;
    const key = dayKey(c.start, offset as (ms: number) => number);
    if (usedDays.has(key)) continue;
    usedDays.add(key);
    placed.push({
      refId: habit.id, title: habit.name, kind: "habit",
      start: c.start, end: c.start + durMs, score: 0.5,
      rationale: `habit (${habit.frequency}) in preferred window`,
    });
  }
  return placed;
}
