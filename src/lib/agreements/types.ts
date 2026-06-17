/**
 * Shared agreement types (Phase 6F).
 *
 * IMPORTANT: This is a LOCAL agreement / audit-friendly signing SIMULATION. It is
 * NOT legally binding, NOT a DocuSign legal/compliance replacement, and NOT legal
 * advice. Nothing here sends email or contacts a provider.
 */

export type AgreementStatus =
  | "draft"
  | "prepared"
  | "sent_for_local_signing"
  | "partially_signed"
  | "completed"
  | "voided";

export type FieldType = "signature" | "initials" | "text" | "date" | "checkbox";

export type RecipientStatus = "pending" | "viewed" | "signed" | "declined" | "skipped";

export type RiskLevel = "low" | "medium" | "high" | "critical";

export const LOCAL_DISCLAIMER =
  "Local agreement workflow — audit-friendly signing simulation. Not legally binding, " +
  "not a DocuSign legal/compliance replacement, and not legal advice.";

export interface FieldDef {
  id: string;
  type: FieldType;
  recipientId?: string | null;
  required: boolean;
  value?: string | null;
}

export interface RecipientDef {
  id: string;
  name: string;
  routingOrder: number;
  required: boolean;
  status: RecipientStatus;
}

export interface ClauseFinding {
  kind: string;
  value: string;
  confidence: number;
}

export interface RiskFinding {
  kind: string;
  level: RiskLevel;
  detail: string;
}

export interface AuditEventLite {
  action: string;
  actor?: string | null;
  detail?: string | null;
  createdAt: string;
}
