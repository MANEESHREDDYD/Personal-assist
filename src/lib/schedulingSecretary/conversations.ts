/** Conversation status helpers (Phase 6C). Pure. */

import type { ConversationStatus, SchedulingIntent } from "./types";

/** Initial status from a freshly parsed instruction. */
export function initialStatus(intent: SchedulingIntent, confidence: number): ConversationStatus {
  if (confidence < 0.5) return "needs_review";
  if (intent === "cancel") return "draft_ready";
  return "parsed";
}

/** Human-readable label for a status chip. */
export function statusLabel(status: ConversationStatus): string {
  const map: Record<ConversationStatus, string> = {
    parsed: "Parsed",
    needs_review: "Needs review",
    slots_generated: "Slots generated",
    draft_ready: "Draft ready",
    waiting_on_recipient: "Waiting on recipient",
    ready_to_schedule: "Ready to schedule",
    calendar_request_created: "Calendar request created",
    completed: "Completed",
    canceled: "Canceled",
  };
  return map[status] ?? status;
}
