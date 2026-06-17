/** Field validation + completion helpers (Phase 6F). Pure + testable. */

import type { FieldDef, FieldType } from "./types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validates a single field value for its type. Returns an error string or null. */
export function validateFieldValue(type: FieldType, required: boolean, value: string | null | undefined): string | null {
  const empty = value == null || (typeof value === "string" && value.trim() === "");
  if (type === "checkbox") {
    if (required && value !== "true") return "This box must be checked.";
    return null;
  }
  if (required && empty) return "This field is required.";
  if (empty) return null;
  if (type === "date" && !DATE_RE.test(value!.trim())) return "Enter a valid date (YYYY-MM-DD).";
  if (type === "signature" && value!.trim().length < 2) return "Enter a signature.";
  return null;
}

/** Returns required field ids for a recipient that are still incomplete. */
export function incompleteRequiredFields(fields: FieldDef[], recipientId: string): string[] {
  return fields
    .filter((f) => f.recipientId === recipientId && f.required)
    .filter((f) => validateFieldValue(f.type, f.required, f.value) !== null)
    .map((f) => f.id);
}

/** Whether every required field across the agreement is completed. */
export function allRequiredComplete(fields: FieldDef[]): boolean {
  return fields.filter((f) => f.required).every((f) => validateFieldValue(f.type, f.required, f.value) === null);
}
