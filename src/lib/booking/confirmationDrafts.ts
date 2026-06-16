/**
 * Booking confirmation / reminder / follow-up draft builders (Phase 6B).
 *
 * These produce LOCAL draft text only. Personal Assist never sends them — the user
 * copies/exports/manually sends. No email is dispatched and no provider is contacted.
 */

export type DraftKind = "confirmation" | "reminder" | "follow_up";

export interface DraftContext {
  meetingTypeTitle: string;
  inviteeName: string;
  slotStart: Date;
  slotEnd: Date;
  timezone: string;
  location?: string | null;
  organizerName?: string | null;
}

function fmt(d: Date, tz: string) {
  try {
    return d.toLocaleString("en-US", {
      timeZone: tz, weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });
  } catch {
    return d.toISOString();
  }
}

const FOOTER =
  "\n\n— This is a local draft created by Personal Assist OS. It was NOT sent. " +
  "Review and send it manually if you choose to.";

export function buildBookingDraft(kind: DraftKind, ctx: DraftContext): { subject: string; body: string } {
  const when = fmt(ctx.slotStart, ctx.timezone);
  const loc = ctx.location ? `\nLocation: ${ctx.location}` : "";
  const organizer = ctx.organizerName ? `\n\nBest,\n${ctx.organizerName}` : "";

  if (kind === "reminder") {
    return {
      subject: `Reminder: ${ctx.meetingTypeTitle} — ${when}`,
      body: `Hi ${ctx.inviteeName},\n\nA quick reminder about our upcoming ${ctx.meetingTypeTitle}.\n\nWhen: ${when}${loc}\n\nLooking forward to it.${organizer}${FOOTER}`,
    };
  }
  if (kind === "follow_up") {
    return {
      subject: `Following up: ${ctx.meetingTypeTitle}`,
      body: `Hi ${ctx.inviteeName},\n\nThank you for the time. As a follow-up to our ${ctx.meetingTypeTitle} on ${when}, here are the next steps and any notes from our conversation:\n\n- \n- \n${organizer}${FOOTER}`,
    };
  }
  // confirmation
  return {
    subject: `Confirmed: ${ctx.meetingTypeTitle} — ${when}`,
    body: `Hi ${ctx.inviteeName},\n\nYour ${ctx.meetingTypeTitle} is confirmed.\n\nWhen: ${when}${loc}\n\nIf you need to reschedule or cancel, just reply and let me know.${organizer}${FOOTER}`,
  };
}
