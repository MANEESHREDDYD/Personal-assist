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
import { getFile } from "../storage";
import { parseMetadata } from "../metadata";
import {
  MAX_PROVIDER_ATTACHMENT_SIZE,
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
  | "not_linked"
  | "not_found";

export interface DocOutcome {
  documentId: string;
  name?: string;
  size?: number;
  contentType?: string;
  status: DocStatus;
  /** Present only for status "ok"; server-only, never serialized to the client. */
  buffer?: Buffer;
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
  draft?: any;
  meta?: Record<string, any>;
  providerDrafts?: Record<string, any>;
  providerDraft?: any;
  existing?: any[];
  outcomes: DocOutcome[];
}

/**
 * Evaluates a single document against the attachment policy. Pure read-only;
 * returns a DocOutcome and never throws on validation failures.
 */
export async function evaluateDocument(
  documentId: string,
  linkedIds: string[],
  existingDocIds: Set<string>
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

  const buffer = await getFile(filename);
  if (!buffer) return { ...base, status: "missing_file" };

  if (buffer.length > MAX_PROVIDER_ATTACHMENT_SIZE) {
    return { ...base, status: "too_large" };
  }

  return { ...base, size: buffer.length, status: "ok", buffer };
}

/**
 * Validates an attachment request end-to-end (request-level + per-document),
 * without any side effects. The caller decides what to do with the outcomes.
 */
export async function validateProviderAttachmentRequest(input: {
  draftId: string;
  provider: any;
  documentIds: any;
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
  const existing: any[] = providerDraft.attachments || [];
  const existingDocIds = new Set(existing.map((a) => a.documentId));

  const outcomes: DocOutcome[] = [];
  for (const documentId of documentIds) {
    outcomes.push(await evaluateDocument(documentId, linkedIds, existingDocIds));
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
