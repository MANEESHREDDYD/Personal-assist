/** Project workload forecasting (Phase 6E). Pure + testable. */

import type { TaskNode } from "./types";

export interface ForecastInput {
  tasks: TaskNode[];
  scheduledMins: number; // already placed on planner/calendar for this project
  targetDate?: number | null;
  now: number;
}

export interface ForecastResult {
  totalEstimateHrs: number;
  scheduledHrs: number;
  unscheduledHrs: number;
  next7DaysHrs: number;
  delayRisk: "low" | "medium" | "high";
  overdueTasks: number;
}

const DAY = 86_400_000;

export function forecastWorkload(input: ForecastInput): ForecastResult {
  const open = input.tasks.filter((t) => t.status !== "done" && t.status !== "canceled");
  const totalMins = open.reduce((s, t) => s + t.estimateMins, 0);
  const totalHrs = Math.round((totalMins / 60) * 10) / 10;
  const scheduledHrs = Math.round((input.scheduledMins / 60) * 10) / 10;
  const unscheduledHrs = Math.max(0, Math.round((totalHrs - scheduledHrs) * 10) / 10);

  const next7Cutoff = input.now + 7 * DAY;
  const next7Mins = open
    .filter((t) => t.dueDate != null && t.dueDate <= next7Cutoff)
    .reduce((s, t) => s + t.estimateMins, 0);
  const next7Hrs = Math.round((next7Mins / 60) * 10) / 10;

  const overdue = open.filter((t) => t.dueDate != null && t.dueDate < input.now).length;

  let delayRisk: ForecastResult["delayRisk"] = "low";
  if (input.targetDate != null) {
    const daysLeft = Math.max(0, (input.targetDate - input.now) / DAY);
    const hoursAvailable = daysLeft * (5 / 7) * 6;
    if (totalHrs > hoursAvailable * 1.25 || overdue > 0) delayRisk = "high";
    else if (totalHrs > hoursAvailable * 0.8) delayRisk = "medium";
  } else if (unscheduledHrs > 8) {
    delayRisk = "medium";
  }

  return { totalEstimateHrs: totalHrs, scheduledHrs, unscheduledHrs, next7DaysHrs: next7Hrs, delayRisk, overdueTasks: overdue };
}
