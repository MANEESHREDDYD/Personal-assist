/** Agreement content hashing (Phase 6F). Pure + testable. Node crypto. */

import crypto from "crypto";

/** SHA-256 hex digest of a string. */
export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Stable hash of an agreement's canonical content + metadata. Never includes
 * absolute file paths — only logical content the user can see.
 */
export function hashAgreement(input: { title: string; content?: string | null; recipients: { name: string; role?: string | null }[] }): string {
  const canonical = JSON.stringify({
    title: input.title.trim(),
    content: (input.content ?? "").trim(),
    recipients: input.recipients.map((r) => ({ name: r.name.trim(), role: (r.role ?? "").trim() })),
  });
  return sha256(canonical);
}

/** Hash of the final signed state (content + completed field values). */
export function hashFinal(input: { title: string; content?: string | null; fields: { type: string; value?: string | null; completedAt?: string | null }[] }): string {
  const canonical = JSON.stringify({
    title: input.title.trim(),
    content: (input.content ?? "").trim(),
    fields: input.fields.map((f) => ({ type: f.type, value: f.value ?? "", completedAt: f.completedAt ?? "" })),
  });
  return sha256(canonical);
}
