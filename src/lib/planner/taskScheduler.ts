/**
 * Task scheduler (Phase 6D). Pure + testable.
 *
 * Greedily packs ordered tasks (due-date, then priority) into contiguous free
 * intervals from the 6A engine. Respects working hours, buffers, lunch/break/
 * do-not-schedule (already folded into `busy`), and avoids conflicts/overbooking
 * by consuming time as it places tasks. Tasks too large for any remaining gap
 * stay unscheduled.
 */

import { computeFreeIntervals, type Interval } from "@/lib/scheduling/engine";
import { orderTasks, taskScore } from "./scoring";
import type { TaskInput, PlannerContext, ScheduledItem } from "./types";

const MIN_MS = 60_000;

export interface TaskScheduleResult {
  scheduled: ScheduledItem[];
  unscheduled: TaskInput[];
}

export function scheduleTasks(tasks: TaskInput[], ctx: PlannerContext): TaskScheduleResult {
  const now = ctx.now ?? Date.now();
  // Work on a mutable copy of free intervals we shrink as we place tasks.
  let free: Interval[] = computeFreeIntervals({
    rangeStart: ctx.rangeStart, rangeEnd: ctx.rangeEnd, workingDays: ctx.workingDays,
    busy: ctx.busy, timezone: ctx.timezone, bufferBeforeMins: ctx.bufferBeforeMins,
    bufferAfterMins: ctx.bufferAfterMins, minNoticeMins: ctx.minNoticeMins, now,
    offsetMinutesFor: ctx.offsetMinutesFor,
  });

  const ordered = orderTasks(tasks);
  const scheduled: ScheduledItem[] = [];
  const unscheduled: TaskInput[] = [];

  for (const task of ordered) {
    const durMs = Math.max(1, task.estimateMins) * MIN_MS;
    // earliest-fit: first free interval with enough room
    const idx = free.findIndex((iv) => iv.end - iv.start >= durMs);
    if (idx === -1) {
      unscheduled.push(task);
      continue;
    }
    const iv = free[idx];
    const start = iv.start;
    const end = start + durMs;
    scheduled.push({
      refId: task.id, title: task.title, kind: "task",
      start, end, score: taskScore(task, start, now),
      rationale: `priority ${task.priority}${task.dueDate ? ", due-aware" : ""}`,
    });
    // shrink the interval (consume from the front)
    const remaining = iv.end - end;
    if (remaining > 0) free[idx] = { start: end, end: iv.end };
    else free = free.filter((_, i) => i !== idx);
  }

  return { scheduled, unscheduled };
}
