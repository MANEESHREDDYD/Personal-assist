/** Booking request validation helpers (Phase 6B). Pure + testable. */

import type { BookingQuestionDef, BookingAnswers, QuestionValidationError } from "./types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validates invitee answers against a meeting type's questions. */
export function validateAnswers(
  questions: BookingQuestionDef[],
  answers: BookingAnswers
): QuestionValidationError[] {
  const errors: QuestionValidationError[] = [];
  for (const q of questions) {
    const raw = answers[q.label];
    const isEmpty =
      raw == null || (typeof raw === "string" && raw.trim() === "") || (q.type === "checkbox" && raw === false);

    if (q.required && isEmpty) {
      errors.push({ label: q.label, message: "This field is required." });
      continue;
    }
    if (isEmpty) continue;

    if (q.type === "email" && typeof raw === "string" && !EMAIL_RE.test(raw.trim())) {
      errors.push({ label: q.label, message: "Enter a valid email address." });
    }
    if (q.type === "select" && q.options && typeof raw === "string" && !q.options.includes(raw)) {
      errors.push({ label: q.label, message: "Select a valid option." });
    }
  }
  return errors;
}

/** Generates a URL-safe slug from a title; callers must ensure DB uniqueness. */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) || "meeting";
}
