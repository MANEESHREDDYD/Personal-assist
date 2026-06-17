/** Signing-order + status helpers (Phase 6F). Pure + testable. */

import type { RecipientDef, AgreementStatus } from "./types";

/**
 * Enforces routing order: a recipient may sign only if all recipients with a lower
 * routing order have signed (or are skipped/declined-and-optional). Returns null if
 * allowed, or an error string.
 */
export function canRecipientSign(recipients: RecipientDef[], recipientId: string): string | null {
  const target = recipients.find((r) => r.id === recipientId);
  if (!target) return "Recipient not found.";
  if (target.status === "signed") return "Already signed.";
  if (target.status === "declined") return "This recipient declined.";
  const blocking = recipients.filter(
    (r) => r.routingOrder < target.routingOrder && r.required && r.status !== "signed" && r.status !== "skipped"
  );
  if (blocking.length > 0) return `Waiting on ${blocking.length} earlier signer(s) in the routing order.`;
  return null;
}

/** Computes the agreement status from recipient statuses. */
export function deriveAgreementStatus(recipients: RecipientDef[], prepared: boolean): AgreementStatus {
  const required = recipients.filter((r) => r.required);
  if (required.some((r) => r.status === "declined")) return "voided";
  const signed = required.filter((r) => r.status === "signed").length;
  if (required.length > 0 && signed === required.length) return "completed";
  if (signed > 0) return "partially_signed";
  return prepared ? "sent_for_local_signing" : "draft";
}
