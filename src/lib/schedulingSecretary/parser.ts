/**
 * Deterministic natural-language scheduling parser (Phase 6C).
 *
 * Pure + testable. Extracts intent, participants, duration, date range, time
 * preference, topic, urgency, follow-up interval, and propose-count from a command.
 * `now` is injectable so date-range tests are deterministic. A richer local-AI
 * extraction can layer on top, but this rules engine is the always-available base.
 */

import type { ParsedInstruction, SchedulingIntent, TimePreference, Urgency, ParsedParticipant } from "./types";

const MIN_MS = 60_000;
const DAY_MS = 86_400_000;

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfDay(ms: number): number {
  return startOfDay(ms) + DAY_MS - 1;
}

/** Detects the scheduling intent from keywords (priority order matters). */
export function detectIntent(text: string): { intent: SchedulingIntent; confidence: number } {
  const t = text.toLowerCase();
  if (/\breschedul|move\b.*\b(meeting|to|after|before)|push (it|this|the meeting)/.test(t)) return { intent: "reschedule", confidence: 0.9 };
  if (/\bcancel\b/.test(t)) return { intent: "cancel", confidence: 0.9 };
  if (/\bclear\b/.test(t)) return { intent: "clear_time", confidence: 0.85 };
  if (/follow[\s-]?up/.test(t)) return { intent: "follow_up", confidence: 0.9 };
  if (/\bhold\b/.test(t)) return { intent: "hold_time", confidence: 0.8 };
  if (/\bfind\b.*\btimes?\b|propose (times|slots)|few times|some times/.test(t)) return { intent: "propose_times", confidence: 0.85 };
  if (/\bschedule|book|set ?up|arrange|1:1|one[\s-]?on[\s-]?one|meeting|call\b/.test(t)) return { intent: "schedule", confidence: 0.8 };
  return { intent: "schedule", confidence: 0.4 };
}

/** Extracts duration in minutes. Supports "30 minutes", "45-minute", "1 hour", "1.5 hours". */
export function parseDuration(text: string): number | undefined {
  const t = text.toLowerCase();
  const m = t.match(/(\d+(?:\.\d+)?)\s*[-\s]?\s*(hour|hours|hr|hrs|h|minute|minutes|min|mins|m)\b/);
  if (!m) return undefined;
  const value = parseFloat(m[1]);
  const unit = m[2];
  if (/^h/.test(unit)) return Math.round(value * 60);
  return Math.round(value);
}

/** "find 3 times" / "propose 4 slots" -> 3 / 4 */
export function parseProposeCount(text: string): number | undefined {
  const m = text.toLowerCase().match(/\b(\d+)\s*(times|slots|options)\b/);
  if (m) return Math.max(1, Math.min(10, parseInt(m[1], 10)));
  return undefined;
}

/** "in 24 hours" / "in 2 days" -> hours */
export function parseFollowUpHours(text: string): number | undefined {
  const m = text.toLowerCase().match(/in\s+(\d+)\s*(hour|hours|hr|hrs|day|days)\b/);
  if (!m) return undefined;
  const value = parseInt(m[1], 10);
  return /day/.test(m[2]) ? value * 24 : value;
}

export function parseTimePreference(text: string): TimePreference {
  const t = text.toLowerCase();
  if (/morning|before noon|am\b/.test(t)) return "morning";
  if (/afternoon|after (1|2|3|4|noon)|pm\b/.test(t)) return "afternoon";
  if (/evening|tonight|after 5|after 6/.test(t)) return "evening";
  return "any";
}

export function parseUrgency(text: string): Urgency {
  const t = text.toLowerCase();
  if (/urgent|asap|right away|today|immediately/.test(t)) return "high";
  if (/no rush|whenever|sometime/.test(t)) return "low";
  return "normal";
}

/** Extracts participants from "with X", "with X and Y", "my manager", etc. */
export function parseParticipants(text: string): ParsedParticipant[] {
  const out: ParsedParticipant[] = [];
  const t = text.replace(/\s+/g, " ").trim();
  // capture the phrase after "with " up to a boundary keyword
  const m = t.match(/\bwith\s+(.+?)(?:\s+(?:next|this|tomorrow|today|on|for|at|in|about|after|before)\b|[.,]|$)/i);
  if (m) {
    const chunk = m[1];
    for (const part of chunk.split(/\s*(?:,|and)\s*/i)) {
      const name = part.trim();
      if (name && name.length <= 60) out.push({ name: titleCase(name) });
    }
  }
  if (out.length === 0) {
    if (/\bmy manager\b/i.test(t)) out.push({ name: "My Manager" });
    else if (/\bteam\b/i.test(t)) out.push({ name: "The Team" });
  }
  return out;
}

function titleCase(s: string): string {
  if (/manager|team/i.test(s) && /\bmy\b/i.test(s)) return s.replace(/\b\w/g, (c) => c.toUpperCase());
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Extracts a topic/title from "for a product review", "investor call", "1:1". */
export function parseTopic(text: string): string | undefined {
  const t = text.trim();
  const forMatch = t.match(/\bfor (?:a |an |the )?([a-z0-9][\w\s-]{2,50})/i);
  if (forMatch) return titleCase(forMatch[1].trim());
  if (/1:1|one[\s-]?on[\s-]?one/i.test(t)) return "1:1";
  if (/investor call/i.test(t)) return "Investor Call";
  if (/product review/i.test(t)) return "Product Review";
  if (/standup/i.test(t)) return "Standup";
  return undefined;
}

export function parseLocation(text: string): string | undefined {
  const t = text.toLowerCase();
  if (/google meet|gmeet/.test(t)) return "Google Meet";
  if (/teams\b/.test(t)) return "Microsoft Teams";
  if (/zoom\b/.test(t)) return "Zoom";
  if (/phone|call me|by phone/.test(t)) return "Phone";
  if (/in[\s-]?person|on[\s-]?site|office/.test(t)) return "In person";
  return undefined;
}

/** Computes a date range (ms) from phrases like "next week", "this Tuesday", "tomorrow". */
export function parseDateRange(text: string, now: number): { rangeStart?: number; rangeEnd?: number } {
  const t = text.toLowerCase();
  const today = startOfDay(now);
  const dow = new Date(now).getDay(); // 0=Sun

  if (/tomorrow/.test(t)) {
    const s = today + DAY_MS;
    return { rangeStart: s, rangeEnd: endOfDay(s) };
  }
  if (/today|this afternoon|this morning|tonight/.test(t)) {
    return { rangeStart: now, rangeEnd: endOfDay(today) };
  }
  // explicit weekday: "next tuesday" / "this friday" / "on wednesday" / "after friday"
  const wdMatch = t.match(/\b(next|this|on|after|before)?\s*(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/);
  if (wdMatch) {
    const qualifier = wdMatch[1] || "this";
    const target = WEEKDAYS.indexOf(wdMatch[2]);
    let delta = (target - dow + 7) % 7;
    if (qualifier === "next") delta += delta === 0 ? 7 : 7; // next week's occurrence
    if (qualifier === "this" && delta === 0) delta = 0;
    if (delta === 0 && qualifier !== "this") delta = 7;
    const dayStart = today + delta * DAY_MS;
    if (qualifier === "after") return { rangeStart: dayStart + DAY_MS, rangeEnd: dayStart + DAY_MS + 7 * DAY_MS };
    if (qualifier === "before") return { rangeStart: now, rangeEnd: endOfDay(dayStart - DAY_MS) };
    return { rangeStart: dayStart, rangeEnd: endOfDay(dayStart) };
  }
  if (/next week/.test(t)) {
    // Monday of next week .. the following Sunday
    const daysUntilNextMon = ((8 - dow) % 7) || 7;
    const mon = today + daysUntilNextMon * DAY_MS;
    return { rangeStart: mon, rangeEnd: endOfDay(mon + 6 * DAY_MS) };
  }
  if (/this week/.test(t)) {
    const endOfWeek = today + ((6 - dow + 7) % 7) * DAY_MS;
    return { rangeStart: now, rangeEnd: endOfDay(endOfWeek) };
  }
  // default: next 7 days
  return { rangeStart: now, rangeEnd: endOfDay(today + 7 * DAY_MS) };
}

/** Full deterministic parse. */
export function parseSchedulingCommand(text: string, now: number = Date.now()): ParsedInstruction {
  const { intent, confidence } = detectIntent(text);
  const { rangeStart, rangeEnd } = parseDateRange(text, now);
  const participants = parseParticipants(text);
  const duration = parseDuration(text);
  const timePreference = parseTimePreference(text);
  const proposeCount = parseProposeCount(text);
  const followUpHours = parseFollowUpHours(text);

  // Confidence: base on intent + how much structure we extracted.
  let conf = confidence;
  if (participants.length) conf += 0.05;
  if (duration) conf += 0.05;
  conf = Math.min(1, Math.round(conf * 100) / 100);

  return {
    intent,
    participants,
    durationMins: duration ?? (intent === "schedule" || intent === "propose_times" ? 30 : undefined),
    rangeStart,
    rangeEnd,
    timePreference,
    topic: parseTopic(text),
    locationPref: parseLocation(text),
    urgency: parseUrgency(text),
    followUpHours,
    proposeCount,
    confidence: conf,
  };
}

export const __test = { startOfDay, endOfDay, MIN_MS, DAY_MS };
