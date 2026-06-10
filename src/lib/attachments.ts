/**
 * Shared attachment policy for Personal Assist.
 *
 * Single source of truth for the blocked executable extension list and the
 * provider-draft attachment size limit (Phase 3I). Used by the provider
 * attachment upload flow and the inbound attachment download routes.
 *
 * Size policy:
 *  - Phase 3I small attachments (<= 3 MB): Outlook simple fileAttachment, Gmail MIME rebuild.
 *  - Phase 3J large attachments (> 3 MB and <= 150 MB): Outlook Graph upload sessions.
 *    Gmail large files are handled conservatively (deferred) to avoid memory-heavy
 *    MIME rebuilds.
 *  - > 150 MB is blocked.
 *
 * Note: blocked-extension filtering is a safety convenience, not a malware scan.
 * Personal Assist makes no malware-scanning or production-security claims.
 */

import path from "path";

export const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".msi", ".scr", ".ps1", ".sh", ".app", ".dmg",
  ".com", ".vbs", ".vbe", ".js", ".jse", ".wsf", ".hta", ".jar", ".reg",
  ".lnk", ".url", ".apk", ".pkg",
];

// Phase 3I: simple/small upload limit. Phase 3J: upload-session large limit.
export const SMALL_PROVIDER_ATTACHMENT_LIMIT = 3 * 1024 * 1024; // 3 MB
export const LARGE_PROVIDER_ATTACHMENT_LIMIT = 150 * 1024 * 1024; // 150 MB

// Backwards-compatible alias (small/simple limit) used by existing callers.
export const MAX_PROVIDER_ATTACHMENT_SIZE = SMALL_PROVIDER_ATTACHMENT_LIMIT;

export type AttachmentSizeClass = "small" | "large" | "too_large";

/**
 * Classifies an attachment by byte size:
 *  - small:     <= 3 MB
 *  - large:     > 3 MB and <= 150 MB
 *  - too_large: > 150 MB (blocked)
 */
export function classifyProviderAttachmentSize(sizeBytes: number): AttachmentSizeClass {
  if (sizeBytes <= SMALL_PROVIDER_ATTACHMENT_LIMIT) return "small";
  if (sizeBytes <= LARGE_PROVIDER_ATTACHMENT_LIMIT) return "large";
  return "too_large";
}

/** Human-readable description of the provider attachment size limits. */
export function formatAttachmentLimit(): string {
  return "small files ≤ 3 MB (simple); large files ≤ 150 MB via Outlook upload sessions; > 150 MB blocked";
}

export function isBlockedExtension(filename: string): boolean {
  const ext = path.extname(filename || "").toLowerCase();
  return BLOCKED_EXTENSIONS.includes(ext);
}

/**
 * Guards against path traversal: a stored filename must be a single path
 * segment with no separators or parent references.
 */
export function isSafeStoredFilename(filename: string): boolean {
  if (!filename) return false;
  if (filename.includes("/") || filename.includes("\\")) return false;
  if (filename.includes("..")) return false;
  return path.basename(filename) === filename;
}

/**
 * Returns the set of local Document ids linked to a draft, from both the
 * draft's relatedDocId and its metadata (attachedDocumentIds / sourceDocumentId).
 */
export function getLinkedDocumentIds(
  draft: { relatedDocId?: string | null },
  meta: Record<string, any>
): string[] {
  const ids = new Set<string>();
  if (draft.relatedDocId) ids.add(draft.relatedDocId);
  if (meta?.sourceDocumentId) ids.add(meta.sourceDocumentId);
  if (Array.isArray(meta?.attachedDocumentIds)) {
    for (const id of meta.attachedDocumentIds) if (id) ids.add(id);
  }
  return Array.from(ids);
}
