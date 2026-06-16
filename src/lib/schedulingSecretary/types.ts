/** Shared types for the AI scheduling secretary (Phase 6C). */

export type SchedulingIntent =
  | "schedule"
  | "propose_times"
  | "reschedule"
  | "cancel"
  | "clear_time"
  | "follow_up"
  | "hold_time";

export type TimePreference = "morning" | "afternoon" | "evening" | "any";
export type Urgency = "low" | "normal" | "high";

export interface ParsedParticipant {
  name: string;
  email?: string;
}

export interface ParsedInstruction {
  intent: SchedulingIntent;
  participants: ParsedParticipant[];
  durationMins?: number;
  rangeStart?: number; // epoch ms
  rangeEnd?: number; // epoch ms
  timePreference: TimePreference;
  topic?: string;
  locationPref?: string;
  urgency: Urgency;
  followUpHours?: number;
  proposeCount?: number;
  confidence: number; // 0..1
}

export type ReplyKind =
  | "propose_times"
  | "confirmation"
  | "reschedule"
  | "cancellation"
  | "follow_up";

export type ConversationStatus =
  | "parsed"
  | "needs_review"
  | "slots_generated"
  | "draft_ready"
  | "waiting_on_recipient"
  | "ready_to_schedule"
  | "calendar_request_created"
  | "completed"
  | "canceled";
