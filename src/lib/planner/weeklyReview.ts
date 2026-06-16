/** Weekly review summarizer (Phase 6D). Pure + testable. */

import { meetingLoadHours, type Interval } from "@/lib/scheduling/engine";
import { analyzeDayLoads, contextSwitchScore, burnoutRisk } from "./scoring";

export interface WeeklyReviewInput {
  busy: Interval[];
  rangeStart: number;
  rangeEnd: number;
  offset: (ms: number) => number;
  plannedFocusHours: number;
  weeklyFocusGoalHrs: number;
  maxMeetingHoursDay: number;
  taskCount: number;
  scheduledTaskCount: number;
  overdueTaskCount: number;
  habitScheduledCount: number;
}

export interface WeeklyReviewResult {
  meetingHours: number;
  fragmentedDays: number;
  meetingHeavyDays: number;
  focusCoveragePct: number;
  contextSwitchScore: number;
  burnoutRisk: number;
  summary: string;
}

export function buildWeeklyReview(input: WeeklyReviewInput): WeeklyReviewResult {
  const loads = analyzeDayLoads(input.busy, input.rangeStart, input.rangeEnd, input.offset);
  const meetingHours = meetingLoadHours(input.busy, { start: input.rangeStart, end: input.rangeEnd });
  const fragmentedDays = loads.filter((l) => l.fragmented).length;
  const meetingHeavyDays = loads.filter((l) => l.meetingHours > input.maxMeetingHoursDay).length;
  const focusCoveragePct = input.weeklyFocusGoalHrs > 0
    ? Math.round(Math.min(1, input.plannedFocusHours / input.weeklyFocusGoalHrs) * 100)
    : 100;
  const csScore = contextSwitchScore(loads);
  const focusDeficit = Math.max(0, input.weeklyFocusGoalHrs - input.plannedFocusHours);
  const risk = burnoutRisk(loads, input.maxMeetingHoursDay, focusDeficit);

  const summary = [
    `Meeting load: ${meetingHours.toFixed(1)}h across the week.`,
    `Focus coverage: ${focusCoveragePct}% of the ${input.weeklyFocusGoalHrs}h goal (${input.plannedFocusHours.toFixed(1)}h planned).`,
    `Tasks: ${input.scheduledTaskCount}/${input.taskCount} scheduled, ${input.overdueTaskCount} overdue.`,
    `Habits scheduled: ${input.habitScheduledCount}.`,
    meetingHeavyDays > 0 ? `${meetingHeavyDays} meeting-heavy day(s).` : "No meeting-heavy days.",
    fragmentedDays > 0 ? `${fragmentedDays} fragmented day(s) — consider consolidating.` : "Calendar is not fragmented.",
    `Workload/burnout risk: ${(risk * 100).toFixed(0)}%.`,
  ].join(" ");

  return {
    meetingHours: Math.round(meetingHours * 100) / 100,
    fragmentedDays, meetingHeavyDays, focusCoveragePct,
    contextSwitchScore: csScore, burnoutRisk: risk, summary,
  };
}
