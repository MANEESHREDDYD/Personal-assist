/**
 * Candidate slot ranking (Phase 6C). Pure + testable.
 *
 * Takes free slots from the Phase 6A engine and re-ranks them against the parsed
 * instruction: time-preference match, urgency (earlier for high), and the engine's
 * own base score (which already prefers mornings / low conflict).
 */

import type { Slot } from "@/lib/scheduling/engine";
import type { TimePreference, Urgency } from "./types";

export interface RankInput {
  slots: Slot[];
  timePreference: TimePreference;
  urgency: Urgency;
  now?: number;
  limit?: number;
  /** Test seam for local-minute computation; default uses host local time. */
  localMinuteOf?: (ms: number) => number;
}

export interface RankedSlot extends Slot {
  rankScore: number;
}

function defaultLocalMinute(ms: number): number {
  const d = new Date(ms);
  return d.getHours() * 60 + d.getMinutes();
}

function matchesPreference(localMinute: number, pref: TimePreference): boolean {
  if (pref === "morning") return localMinute < 12 * 60;
  if (pref === "afternoon") return localMinute >= 12 * 60 && localMinute < 17 * 60;
  if (pref === "evening") return localMinute >= 17 * 60;
  return true;
}

export function rankCandidateSlots(input: RankInput): RankedSlot[] {
  const localMinute = input.localMinuteOf || defaultLocalMinute;
  const now = input.now ?? Date.now();
  const limit = input.limit ?? 3;

  const ranked = input.slots.map((s) => {
    let score = s.score; // engine base (0..1)
    const lm = localMinute(s.start);
    if (input.timePreference !== "any" && matchesPreference(lm, input.timePreference)) score += 0.5;
    if (input.urgency === "high") {
      // earlier slots strongly preferred when urgent
      const daysOut = Math.max(0, (s.start - now) / 86_400_000);
      score += Math.max(0, 0.5 - daysOut * 0.1);
    }
    return { ...s, rankScore: Math.round(score * 1000) / 1000 };
  });

  return ranked
    .sort((a, b) => b.rankScore - a.rankScore || a.start - b.start)
    .slice(0, limit);
}
