/**
 * Booking slot generation (Phase 6B) — a thin, typed wrapper over the Phase 6A
 * availability engine so booking pages reuse the exact same conflict/buffer/
 * working-hours logic. Pure and testable.
 */

import { computeFreeSlots, type WorkingDay, type Interval, type Slot } from "@/lib/scheduling/engine";

export interface MeetingTypeSlotConfig {
  durationMins: number;
  bufferBeforeMins?: number;
  bufferAfterMins?: number;
  minNoticeMins?: number;
  maxPerDay?: number;
  slotGranularityMins?: number;
}

export interface GenerateBookingSlotsInput {
  meetingType: MeetingTypeSlotConfig;
  workingDays: WorkingDay[];
  busy: Interval[];
  timezone?: string;
  rangeStart: number;
  rangeEnd: number;
  now?: number;
  offsetMinutesFor?: (ms: number) => number;
}

export function generateBookingSlots(input: GenerateBookingSlotsInput): Slot[] {
  return computeFreeSlots({
    durationMins: input.meetingType.durationMins,
    rangeStart: input.rangeStart,
    rangeEnd: input.rangeEnd,
    workingDays: input.workingDays,
    busy: input.busy,
    timezone: input.timezone,
    bufferBeforeMins: input.meetingType.bufferBeforeMins ?? 0,
    bufferAfterMins: input.meetingType.bufferAfterMins ?? 0,
    slotGranularityMins: input.meetingType.slotGranularityMins ?? input.meetingType.durationMins,
    minNoticeMins: input.meetingType.minNoticeMins ?? 0,
    maxPerDay: input.meetingType.maxPerDay ?? Infinity,
    now: input.now,
    offsetMinutesFor: input.offsetMinutesFor,
    preferMornings: true,
  });
}
