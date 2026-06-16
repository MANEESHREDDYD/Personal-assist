/** Focus-time optimizer (Phase 6D). Pure + testable. */

import { computeFreeIntervals, type Interval } from "@/lib/scheduling/engine";
import type { PlannerContext, FocusPolicyInput, ScheduledItem } from "./types";

const MIN_MS = 60_000;

/**
 * Proposes deep-work focus blocks to meet a weekly focus goal. Prefers mornings,
 * uses the largest free gaps first, and never exceeds the goal. Each block is at
 * least `minFocusBlockMins`. Returns proposed focus blocks (no provider write).
 */
export function optimizeFocus(policy: FocusPolicyInput, ctx: PlannerContext): ScheduledItem[] {
  const offset = ctx.offsetMinutesFor || (() => 0);
  const free = computeFreeIntervals({
    rangeStart: ctx.rangeStart, rangeEnd: ctx.rangeEnd, workingDays: ctx.workingDays,
    busy: ctx.busy, timezone: ctx.timezone, now: ctx.now, offsetMinutesFor: ctx.offsetMinutesFor,
  });

  const minBlock = Math.max(15, policy.minFocusBlockMins) * MIN_MS;
  let remainingMs = Math.max(0, policy.weeklyFocusGoalHrs) * 3_600_000;

  // Score gaps: prefer mornings (lower local minute) and larger gaps.
  const localMinute = (ms: number) => {
    const local = new Date(ms + (offset as (m: number) => number)(ms) * MIN_MS);
    return local.getUTCHours() * 60 + local.getUTCMinutes();
  };
  const ranked = [...free].sort((a, b) => {
    if (policy.preferFocusMornings) {
      const am = localMinute(a.start), bm = localMinute(b.start);
      if (am !== bm) return am - bm;
    }
    return (b.end - b.start) - (a.end - a.start);
  });

  const blocks: ScheduledItem[] = [];
  for (const gap of ranked) {
    if (remainingMs < minBlock) break;
    let cursor = gap.start;
    while (gap.end - cursor >= minBlock && remainingMs >= minBlock) {
      const take = Math.min(gap.end - cursor, remainingMs, 4 * 3_600_000); // cap a block at 4h
      if (take < minBlock) break;
      blocks.push({
        refId: `focus-${blocks.length}`, title: "Deep work", kind: "focus",
        start: cursor, end: cursor + take, score: 0.8,
        rationale: localMinute(cursor) < 720 ? "morning focus block" : "focus block",
      });
      cursor += take;
      remainingMs -= take;
    }
  }
  return blocks;
}

/** Total free hours available within the range (for focus-deficit calc). */
export function freeHours(ctx: PlannerContext): number {
  const free = computeFreeIntervals({
    rangeStart: ctx.rangeStart, rangeEnd: ctx.rangeEnd, workingDays: ctx.workingDays,
    busy: ctx.busy, timezone: ctx.timezone, now: ctx.now, offsetMinutesFor: ctx.offsetMinutesFor,
  });
  const ms = free.reduce((s: number, iv: Interval) => s + (iv.end - iv.start), 0);
  return Math.round((ms / 3_600_000) * 100) / 100;
}
