/** Flexible meeting optimizer (Phase 6D). Pure + testable. Proposes only. */

import { computeFreeIntervals, type Interval } from "@/lib/scheduling/engine";
import { analyzeDayLoads, dayKey } from "./scoring";
import type { PlannerContext } from "./types";

export interface FlexibleMeeting extends Interval {
  id: string;
  title: string;
}

export interface MoveProposal {
  meetingId: string;
  title: string;
  fromStart: number;
  fromEnd: number;
  toStart: number;
  toEnd: number;
  rationale: string;
}

/**
 * Detects overloaded days and proposes moving a flexible meeting from an overloaded
 * day into a free slot on a lighter day. NEVER moves anything — returns proposals
 * for explicit approval only.
 */
export function proposeFlexibleMoves(
  meetings: FlexibleMeeting[],
  ctx: PlannerContext,
  maxMeetingHoursDay: number
): MoveProposal[] {
  const offset = ctx.offsetMinutesFor || (() => 0);
  const off = offset as (ms: number) => number;
  const loads = analyzeDayLoads(ctx.busy, ctx.rangeStart, ctx.rangeEnd, off);
  const overloaded = new Set(loads.filter((l) => l.meetingHours > maxMeetingHoursDay).map((l) => l.dayKey));
  if (overloaded.size === 0) return [];

  const free = computeFreeIntervals({
    rangeStart: ctx.rangeStart, rangeEnd: ctx.rangeEnd, workingDays: ctx.workingDays,
    busy: ctx.busy, timezone: ctx.timezone, now: ctx.now, offsetMinutesFor: ctx.offsetMinutesFor,
  });

  const proposals: MoveProposal[] = [];
  for (const m of meetings) {
    const mDay = dayKey(m.start, off);
    if (!overloaded.has(mDay)) continue;
    const dur = m.end - m.start;
    // find a free interval on a NON-overloaded day with enough room
    const target = free.find((iv) => iv.end - iv.start >= dur && !overloaded.has(dayKey(iv.start, off)));
    if (!target) continue;
    proposals.push({
      meetingId: m.id, title: m.title,
      fromStart: m.start, fromEnd: m.end,
      toStart: target.start, toEnd: target.start + dur,
      rationale: `"${m.title}" is on an overloaded day; moving frees meeting load`,
    });
  }
  return proposals;
}
