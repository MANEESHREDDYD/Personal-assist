/** Follow-up scheduling helpers (Phase 6C). Pure. */

/** Computes the follow-up due timestamp from an interval in hours. */
export function computeFollowUpDueAt(now: number, intervalHours: number): number {
  return now + Math.max(1, intervalHours) * 3_600_000;
}

/** Whether a follow-up is due given the current time. */
export function isFollowUpDue(dueAtMs: number, now: number = Date.now()): boolean {
  return now >= dueAtMs;
}
