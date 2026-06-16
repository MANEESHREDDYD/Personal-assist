/**
 * Scheduling reply draft generation (Phase 6C).
 *
 * Produces LOCAL draft text only — Personal Assist never sends these. Every draft
 * is marked as a local draft requiring manual review before sending. No provider is contacted.
 */

import type { ReplyKind, ParsedParticipant } from "./types";

export interface DraftContext {
  topic: string;
  participants: ParsedParticipant[];
  candidateSlots: { start: Date; end: Date }[];
  timezone: string;
  location?: string | null;
  organizerName?: string | null;
  bookingLink?: string | null; // local booking link, clearly marked local-only
  followUpHours?: number | null;
}

const FOOTER =
  "\n\n— Local draft created by Personal Assist OS. It was NOT sent. Review and send manually if you choose to.";

function fmt(d: Date, tz: string) {
  try {
    return d.toLocaleString("en-US", {
      timeZone: tz, weekday: "short", month: "short", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });
  } catch {
    return d.toISOString();
  }
}

function greeting(participants: ParsedParticipant[]): string {
  const names = participants.map((p) => p.name).filter(Boolean);
  if (names.length === 0) return "Hi,";
  if (names.length === 1) return `Hi ${names[0]},`;
  return `Hi ${names.slice(0, -1).join(", ")} and ${names[names.length - 1]},`;
}

export function buildSchedulingReply(kind: ReplyKind, ctx: DraftContext): { subject: string; body: string } {
  const hello = greeting(ctx.participants);
  const sign = ctx.organizerName ? `\n\nBest,\n${ctx.organizerName}` : "";
  const slotLines = ctx.candidateSlots.map((s, i) => `  ${i + 1}. ${fmt(s.start, ctx.timezone)}`).join("\n");
  const link = ctx.bookingLink ? `\n\nOr grab any time on my booking page (local link): ${ctx.bookingLink}` : "";

  if (kind === "confirmation") {
    const first = ctx.candidateSlots[0];
    return {
      subject: `Confirmed: ${ctx.topic}`,
      body: `${hello}\n\nConfirming our ${ctx.topic}${first ? ` for ${fmt(first.start, ctx.timezone)}` : ""}.${ctx.location ? `\nLocation: ${ctx.location}` : ""}${sign}${FOOTER}`,
    };
  }
  if (kind === "reschedule") {
    return {
      subject: `Reschedule: ${ctx.topic}`,
      body: `${hello}\n\nI'd like to reschedule our ${ctx.topic}. Here are a few alternative times (${ctx.timezone}):\n\n${slotLines || "  (no candidate times yet)"}${link}\n\nLet me know what works.${sign}${FOOTER}`,
    };
  }
  if (kind === "cancellation") {
    return {
      subject: `Cancelling: ${ctx.topic}`,
      body: `${hello}\n\nApologies, but I need to cancel our ${ctx.topic}. I'll follow up to find another time.${sign}${FOOTER}`,
    };
  }
  if (kind === "follow_up") {
    return {
      subject: `Following up: ${ctx.topic}`,
      body: `${hello}\n\nJust following up on scheduling our ${ctx.topic}. Do any of these still work (${ctx.timezone})?\n\n${slotLines || "  (propose new times)"}${link}${sign}${FOOTER}`,
    };
  }
  // propose_times
  return {
    subject: `Proposed times: ${ctx.topic}`,
    body: `${hello}\n\nWould any of these work for ${ctx.topic}? Times shown in ${ctx.timezone}:\n\n${slotLines || "  (no candidate times found — try a wider range)"}${ctx.location ? `\n\nLocation: ${ctx.location}` : ""}${link}\n\nHappy to adjust.${sign}${FOOTER}`,
  };
}
