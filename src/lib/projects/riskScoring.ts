/**
 * Heuristic project risk scoring (Phase 6E). Pure + testable.
 * Decision support only — not advice, not a guarantee.
 */

import { blockedTaskIds, bottlenecks } from "./dependencies";
import type { TaskNode, RiskFinding } from "./types";

export interface RiskInput {
  tasks: TaskNode[];
  targetDate?: number | null;
  owner?: string | null;
  now: number;
  /** scheduled minutes already placed on the calendar/planner for this project. */
  scheduledMins?: number;
  /** ms since last status change, for stale detection. */
  lastUpdatedMs?: number | null;
}

const DAY = 86_400_000;

export function scoreProjectRisks(input: RiskInput): RiskFinding[] {
  const findings: RiskFinding[] = [];
  const open = input.tasks.filter((t) => t.status !== "done" && t.status !== "canceled");
  const totalMins = open.reduce((s, t) => s + t.estimateMins, 0);

  // 1. deadline / approaching due
  if (input.targetDate != null) {
    const daysLeft = (input.targetDate - input.now) / DAY;
    const workDaysLeft = Math.max(0, daysLeft) * (5 / 7);
    const hoursLeft = workDaysLeft * 6;
    const hoursNeeded = totalMins / 60;
    if (daysLeft < 0 && open.length > 0) findings.push({ kind: "deadline", level: "critical", detail: `Target date passed with ${open.length} open task(s).` });
    else if (hoursNeeded > hoursLeft && open.length > 0) findings.push({ kind: "deadline", level: hoursNeeded > hoursLeft * 1.5 ? "high" : "medium", detail: `~${Math.round(hoursNeeded)}h of work remaining but only ~${Math.round(hoursLeft)}h available before the target date.` });
    if (daysLeft >= 0 && daysLeft <= 2 && open.length > 0) findings.push({ kind: "approaching_due", level: "medium", detail: `Target date is within ${Math.ceil(daysLeft)} day(s).` });
  }

  // 2. missing owner
  if (!input.owner || !input.owner.trim()) findings.push({ kind: "missing_owner", level: "low", detail: "No project owner/context set." });
  const ownerlessTasks = open.filter((t) => !t.ownerName || !t.ownerName.trim()).length;
  if (open.length > 0 && ownerlessTasks === open.length && open.length >= 3) findings.push({ kind: "missing_owner", level: "medium", detail: `${ownerlessTasks} open task(s) have no owner.` });

  // 3. blocked tasks
  const blocked = blockedTaskIds(input.tasks);
  if (blocked.length > 0) findings.push({ kind: "blocked_task", level: blocked.length >= 3 ? "high" : "medium", detail: `${blocked.length} task(s) blocked by incomplete prerequisites.` });

  // 4. dependency bottleneck
  const bn = bottlenecks(input.tasks);
  if (bn[0] && bn[0].blocks >= 3) findings.push({ kind: "dependency_bottleneck", level: "high", detail: `A single task blocks ${bn[0].blocks} others.` });

  // 5. too many high-priority
  const highPri = open.filter((t) => t.priority <= 1).length;
  if (highPri >= 5) findings.push({ kind: "too_many_high_priority", level: "medium", detail: `${highPri} top-priority tasks competing for attention.` });

  // 6. insufficient scheduled time
  if (input.scheduledMins != null && totalMins > 0) {
    const coverage = input.scheduledMins / totalMins;
    if (coverage < 0.25) findings.push({ kind: "insufficient_time", level: open.length > 4 ? "high" : "medium", detail: `Only ${Math.round(coverage * 100)}% of estimated work is scheduled.` });
  }

  // 7. stale status
  if (input.lastUpdatedMs != null) {
    const staleDays = (input.now - input.lastUpdatedMs) / DAY;
    if (staleDays > 7 && open.length > 0) findings.push({ kind: "stale_status", level: "low", detail: `No updates in ${Math.round(staleDays)} days.` });
  }

  return findings;
}
