/** Shared planner types (Phase 6D). */

import type { Interval, WorkingDay } from "@/lib/scheduling/engine";

export interface TaskInput {
  id: string;
  title: string;
  priority: number; // 1 highest .. 5 lowest
  dueDate?: number | null; // epoch ms
  estimateMins: number;
  requiresFocus?: boolean;
  energyLevel?: "low" | "medium" | "high";
}

export interface HabitInput {
  id: string;
  name: string;
  durationMins: number;
  windowStartMin: number; // local minutes from midnight
  windowEndMin: number;
  frequency: "daily" | "weekdays" | "weekly";
}

export interface ScheduledItem extends Interval {
  refId: string;
  title: string;
  kind: "task" | "habit" | "focus" | "break";
  score: number;
  rationale: string;
}

export interface PlannerContext {
  workingDays: WorkingDay[];
  timezone: string;
  busy: Interval[];
  rangeStart: number;
  rangeEnd: number;
  now?: number;
  bufferBeforeMins?: number;
  bufferAfterMins?: number;
  slotGranularityMins?: number;
  minNoticeMins?: number;
  maxPerDay?: number;
  offsetMinutesFor?: (ms: number) => number;
  preferMornings?: boolean;
}

export interface FocusPolicyInput {
  weeklyFocusGoalHrs: number;
  minFocusBlockMins: number;
  preferFocusMornings: boolean;
}

export interface DayLoad {
  dayKey: string; // YYYY-M-D (local)
  meetingHours: number;
  blockCount: number;
  fragmented: boolean;
  contextSwitches: number;
}
