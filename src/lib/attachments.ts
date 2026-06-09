/**
 * Shared attachment policy for Personal Assist.
 *
 * Single source of truth for the blocked executable extension list and the
 * provider-draft attachment size limit (Phase 3I). Used by the provider
 * attachment upload flow and the inbound attachment download routes.
 *
 * Phase 3I supports only small attachments (<= 3 MB) so Outlook simple
 * file attachments and Gmail MIME draft updates stay reliable. Larger uploads
 * (Graph upload sessions) are planned for Phase 3J.
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

// Phase 3I MVP: small attachments only. Phase 3J will add upload sessions.
export const MAX_PROVIDER_ATTACHMENT_SIZE = 3 * 1024 * 1024; // 3 MB

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
