/** Planner scoring + day-load analysis (Phase 6D). Pure + testable. */

import { mergeIntervals, type Interval } from "@/lib/scheduling/engine";
import type { TaskInput, DayLoad } from "./types";

const DAY_MS = 86_400_000;

/**
 * Orders tasks for scheduling: earlier due dates first, then higher priority
 * (lower number), then larger estimates (pack big rocks first within a tier).
 */
export function orderTasks(tasks: TaskInput[]): TaskInput[] {
  return [...tasks].sort((a, b) => {
    const ad = a.dueDate ?? Infinity;
    const bd = b.dueDate ?? Infinity;
    if (ad !== bd) return ad - bd;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.estimateMins - a.estimateMins;
  });
}

/** Priority/urgency score for a task at a given time (higher = schedule sooner). */
export function taskScore(task: TaskInput, slotStart: number, now: number): number {
  let score = (6 - Math.min(5, Math.max(1, task.priority))) / 5; // 0.2..1.0
  if (task.dueDate != null) {
    const hoursToDue = (task.dueDate - slotStart) / 3_600_000;
    if (hoursToDue <= 0) score += 1; // overdue → urgent
    else if (hoursToDue < 48) score += 0.5;
    else if (hoursToDue < 168) score += 0.25;
  }
  void now;
  return Math.round(score * 1000) / 1000;
}

/** Local day key for grouping. */
export function dayKey(ms: number, offset: (ms: number) => number): string {
  const local = new Date(ms + offset(ms) * 60_000);
  return `${local.getUTCFullYear()}-${local.getUTCMonth()}-${local.getUTCDate()}`;
}

/**
 * Analyzes meeting load + fragmentation + context switches per day.
 * Fragmented = many small gaps between meetings (>= 3 separate busy intervals with
 * gaps under 60 min between some of them). Context switches = transitions between
 * busy intervals on the same day.
 */
export function analyzeDayLoads(
  busy: Interval[],
  rangeStart: number,
  rangeEnd: number,
  offset: (ms: number) => number
): DayLoad[] {
  const merged = mergeIntervals(busy);
  const byDay = new Map<string, Interval[]>();
  for (const iv of merged) {
    const key = dayKey(iv.start, offset);
    const arr = byDay.get(key) ?? [];
    arr.push(iv);
    byDay.set(key, arr);
  }
  const loads: DayLoad[] = [];
  for (let cursor = rangeStart; cursor <= rangeEnd; cursor += DAY_MS) {
    const key = dayKey(cursor, offset);
    if (loads.some((l) => l.dayKey === key)) continue;
    const ivs = (byDay.get(key) ?? []).sort((a, b) => a.start - b.start);
    let meetingMs = 0;
    let smallGaps = 0;
    for (let i = 0; i < ivs.length; i++) {
      meetingMs += ivs[i].end - ivs[i].start;
      if (i > 0) {
        const gap = ivs[i].start - ivs[i - 1].end;
        if (gap > 0 && gap < 60 * 60_000) smallGaps++;
      }
    }
    const contextSwitches = Math.max(0, ivs.length - 1);
    loads.push({
      dayKey: key,
      meetingHours: Math.round((meetingMs / 3_600_000) * 100) / 100,
      blockCount: ivs.length,
      fragmented: ivs.length >= 3 && smallGaps >= 2,
      contextSwitches,
    });
  }
  return loads;
}

/** Average context-switch score across days (0..1, normalized at 8 switches). */
export function contextSwitchScore(loads: DayLoad[]): number {
  if (loads.length === 0) return 0;
  const avg = loads.reduce((s, l) => s + l.contextSwitches, 0) / loads.length;
  return Math.round(Math.min(1, avg / 8) * 1000) / 1000;
}

/** Burnout/workload heuristic (0..1) from meeting load + fragmentation + focus deficit. */
export function burnoutRisk(loads: DayLoad[], maxMeetingHoursDay: number, focusDeficitHrs: number): number {
  if (loads.length === 0) return 0;
  const overloadedDays = loads.filter((l) => l.meetingHours > maxMeetingHoursDay).length;
  const fragmentedDays = loads.filter((l) => l.fragmented).length;
  const overloadFactor = overloadedDays / loads.length;
  const fragFactor = fragmentedDays / loads.length;
  const focusFactor = Math.min(1, Math.max(0, focusDeficitHrs) / 10);
  const risk = 0.45 * overloadFactor + 0.3 * fragFactor + 0.25 * focusFactor;
  return Math.round(Math.min(1, risk) * 1000) / 1000;
}
