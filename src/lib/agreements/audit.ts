/** Agreement audit timeline helpers (Phase 6F). Pure. */

import type { AuditEventLite } from "./types";

/** Sorts audit events chronologically for certificate rendering. */
export function buildAuditTimeline(events: AuditEventLite[]): AuditEventLite[] {
  return [...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export const AUDIT_ACTIONS = [
  "created", "template_applied", "recipient_added", "field_added", "prepared",
  "signing_opened", "field_completed", "recipient_signed", "recipient_declined",
  "completed", "voided", "certificate_generated", "reminder_drafted",
] as const;
