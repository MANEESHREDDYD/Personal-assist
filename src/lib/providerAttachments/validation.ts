/**
 * Provider attachment validation (Phase 3I / 3I.2).
 *
 * Pure, side-effect-free validation logic shared by the provider-attachments API
 * route and the local integration test harness. It only READS the database and
 * filesystem — it never contacts Gmail/Outlook, never mutates EmailDraft metadata,
 * never uploads, and never logs audits or notifications. The API route layers
 * audit logging, notifications, and the actual provider upload on top.
 *
 * Imports are relative (not "@/..") so this module can be imported both by Next.js
 * and by a plain `tsx` test script.
 */

import path from "path";
import { prisma } from "../prisma";
import { statFile } from "../storage";
import { parseMetadata } from "../metadata";
import {
  classifyProviderAttachmentSize,
  AttachmentSizeClass,
  isBlockedExtension,
  isSafeStoredFilename,
  getLinkedDocumentIds,
} from "../attachments";

export type ProviderValue = "gmail_draft" | "outlook_draft";

export const PROVIDER_KEY: Record<ProviderValue, "gmail" | "outlook"> = {
  gmail_draft: "gmail",
  outlook_draft: "outlook",
};
export const PROVIDER_LABEL: Record<ProviderValue, string> = {
  gmail_draft: "Gmail",
  outlook_draft: "Outlook",
};

export type DocStatus =
  | "ok"
  | "already_attached"
  | "missing_file"
  | "blocked_type"
  | "too_large"
  | "deferred"
  | "not_linked"
  | "not_found";

export type UploadMode = "simple" | "upload_session" | "deferred" | "blocked";

export interface DocOutcome {
  documentId: string;
  name?: string;
  size?: number;
  contentType?: string;
  status: DocStatus;
  sizeClass?: AttachmentSizeClass;
  uploadMode?: UploadMode;
}

export type RequestErrorCode =
  | "invalid_provider"
  | "no_documents"
  | "draft_not_found"
  | "not_approved"
  | "provider_draft_missing";

export interface RequestValidation {
  ok: boolean;
  httpStatus: number;
  errorCode?: RequestErrorCode;
  error?: string;
  providerKey?: "gmail" | "outlook";
  label?: string;
  draft?: unknown;
  meta?: Record<string, unknown>;
  providerDrafts?: Record<string, unknown>;
  providerDraft?: unknown;
  existing?: unknown[];
  outcomes: DocOutcome[];
}

/**
 * Maps a size class to the per-provider status + upload mode.
 *  - small     -> simple upload (Gmail MIME rebuild / Outlook fileAttachment)
 *  - large     -> Outlook upload session; Gmail deferred (conservative)
 *  - too_large -> blocked
 */
function resolveProviderMode(
  provider: ProviderValue,
  sizeClass: AttachmentSizeClass
): { status: DocStatus; uploadMode: UploadMode } {
  if (sizeClass === "too_large") return { status: "too_large", uploadMode: "blocked" };
  if (sizeClass === "large") {
    return provider === "outlook_draft"
      ? { status: "ok", uploadMode: "upload_session" }
      : { status: "deferred", uploadMode: "deferred" };
  }
  return { status: "ok", uploadMode: "simple" };
}

/**
 * Evaluates a single document against the attachment policy for a provider.
 * Pure read-only: checks existence via stat (no full read) and classifies size
 * from the Document record. Never throws on validation failures.
 */
export async function evaluateDocument(
  documentId: string,
  linkedIds: string[],
  existingDocIds: Set<string>,
  provider: ProviderValue
): Promise<DocOutcome> {
  if (existingDocIds.has(documentId)) {
    return { documentId, status: "already_attached" };
  }
  if (!linkedIds.includes(documentId)) {
    return { documentId, status: "not_linked" };
  }

  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return { documentId, status: "not_found" };

  const base = {
    documentId,
    name: doc.originalName,
    size: doc.size,
    contentType: doc.mimeType,
  };

  const filename = path.basename(doc.path || "");
  if (!filename || !isSafeStoredFilename(filename)) {
    return { ...base, status: "missing_file" };
  }
  if (isBlockedExtension(doc.originalName) || isBlockedExtension(filename)) {
    return { ...base, status: "blocked_type" };
  }

  const onDiskSize = await statFile(filename);
  if (onDiskSize === null) return { ...base, status: "missing_file" };

  // Classify by the recorded Document size (authoritative for the workflow).
  const sizeClass = classifyProviderAttachmentSize(doc.size ?? onDiskSize);
  const { status, uploadMode } = resolveProviderMode(provider, sizeClass);

  return { ...base, status, sizeClass, uploadMode };
}

/**
 * Validates an attachment request end-to-end (request-level + per-document),
 * without any side effects. The caller decides what to do with the outcomes.
 */
export async function validateProviderAttachmentRequest(input: {
  draftId: string;
  provider: unknown;
  documentIds: unknown;
}): Promise<RequestValidation> {
  const provider = input.provider as ProviderValue;
  if (provider !== "gmail_draft" && provider !== "outlook_draft") {
    return { ok: false, httpStatus: 400, errorCode: "invalid_provider", error: "Invalid provider.", outcomes: [] };
  }

  const documentIds: string[] = Array.isArray(input.documentIds) ? input.documentIds : [];
  if (documentIds.length === 0) {
    return { ok: false, httpStatus: 400, errorCode: "no_documents", error: "No documents selected.", outcomes: [] };
  }

  const providerKey = PROVIDER_KEY[provider];
  const label = PROVIDER_LABEL[provider];

  const draft = await prisma.emailDraft.findUnique({ where: { id: input.draftId } });
  if (!draft) {
    return { ok: false, httpStatus: 404, errorCode: "draft_not_found", error: "Draft not found", outcomes: [] };
  }
  if (draft.status !== "approved") {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: "not_approved",
      error: "Draft must be approved before attaching to a provider draft.",
      providerKey,
      label,
      draft,
      outcomes: [],
    };
  }

  const meta = parseMetadata(draft.metadata);
  const providerDrafts = meta.providerDrafts || {};
  const providerDraft = providerDrafts[providerKey];
  if (!providerDraft) {
    return {
      ok: false,
      httpStatus: 400,
      errorCode: "provider_draft_missing",
      error: `No ${label} provider draft exists yet. Create the provider draft first.`,
      providerKey,
      label,
      draft,
      meta,
      providerDrafts,
      outcomes: [],
    };
  }

  const linkedIds = getLinkedDocumentIds(draft, meta);
  const existing: unknown[] = (providerDraft as { attachments?: unknown[] }).attachments || [];
  const existingDocIds = new Set(existing.map((a: { documentId: string }) => a.documentId));

  const outcomes: DocOutcome[] = [];
  for (const documentId of documentIds) {
    outcomes.push(await evaluateDocument(documentId, linkedIds, existingDocIds, provider));
  }

  return {
    ok: true,
    httpStatus: 200,
    providerKey,
    label,
    draft,
    meta,
    providerDrafts,
    providerDraft,
    existing,
    outcomes,
  };
}
