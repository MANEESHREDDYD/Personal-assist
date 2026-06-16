import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseMetadata, stringifyMetadata } from "@/lib/metadata";
import { getFile } from "@/lib/storage";
import {
  SMALL_PROVIDER_ATTACHMENT_LIMIT,
  LARGE_PROVIDER_ATTACHMENT_LIMIT,
  classifyProviderAttachmentSize,
  isBlockedExtension,
  isSafeStoredFilename,
  getLinkedDocumentIds,
} from "@/lib/attachments";
import { getValidAccessToken } from "@/lib/integrations/draftTokens";
import { updateGmailDraftWithAttachments } from "@/lib/integrations/gmailDraft";
import {
  attachFileToOutlookDraft,
  attachLargeFileToOutlookDraft,
} from "@/lib/integrations/outlookDraft";
import {
  validateProviderAttachmentRequest,
  ProviderValue,
} from "@/lib/providerAttachments/validation";

export const dynamic = "force-dynamic";

interface ProviderDraftRecord {
  draftId?: string;
  messageId?: string;
  attachments?: { documentId: string }[];
  [key: string]: unknown;
}

interface DraftContent {
  to: string | null;
  cc: string | null;
  bcc: string | null;
  subject: string | null;
  body: string | null;
}

const PROVIDER_SUPPORT = {
  gmail: "small files (≤ 3 MB) via MIME rebuild; large files deferred",
  outlook: "small (≤ 3 MB) via simple upload; large (> 3 MB, ≤ 150 MB) via upload session; > 150 MB blocked",
};

async function notify(title: string, message: string, severity: string, draftId: string) {
  try {
    await prisma.notification.create({
      data: {
        title,
        message,
        type: "provider_attachment",
        severity,
        status: "unread",
        relatedEntityType: "EmailDraft",
        relatedEntityId: draftId,
      },
    });
  } catch (e) {
    console.error("Failed to create provider attachment notification", e);
  }
}

// Loads a Document + its file buffer for upload, applying the path-traversal guard.
async function loadDocBuffer(documentId: string) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return null;
  const fn = path.basename(doc.path || "");
  if (!isSafeStoredFilename(fn)) return null;
  const buffer = await getFile(fn);
  if (!buffer) return null;
  return { doc, buffer };
}

/** GET — returns safe metadata for documents linked to the draft + provider attach status. */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const draft = await prisma.emailDraft.findUnique({ where: { id } });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const meta = parseMetadata(draft.metadata);
    const providerDrafts = (meta.providerDrafts as Record<string, ProviderDraftRecord>) || {};
    const linkedIds = getLinkedDocumentIds(draft, meta);

    const gmailAttached: string[] = (providerDrafts.gmail?.attachments || []).map((a: { documentId: string }) => a.documentId);
    const outlookAttached: string[] = (providerDrafts.outlook?.attachments || []).map((a: { documentId: string }) => a.documentId);

    const docs = linkedIds.length
      ? await prisma.document.findMany({ where: { id: { in: linkedIds } } })
      : [];

    const documents = docs.map((d) => {
      const filename = path.basename(d.path || "");
      const blocked = isBlockedExtension(d.originalName) || isBlockedExtension(filename);
      const sizeClass = classifyProviderAttachmentSize(d.size || 0);
      return {
        id: d.id,
        name: d.originalName,
        size: d.size,
        contentType: d.mimeType,
        blocked,
        sizeClass,
        large: sizeClass === "large",
        tooLarge: sizeClass === "too_large",
        attachedGmail: gmailAttached.includes(d.id),
        attachedOutlook: outlookAttached.includes(d.id),
      };
    });

    return NextResponse.json({
      approved: draft.status === "approved",
      hasGmailDraft: !!providerDrafts.gmail,
      hasOutlookDraft: !!providerDrafts.outlook,
      smallMax: SMALL_PROVIDER_ATTACHMENT_LIMIT,
      largeMax: LARGE_PROVIDER_ATTACHMENT_LIMIT,
      providerSupport: PROVIDER_SUPPORT,
      documents,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load linked documents" }, { status: 500 });
  }
}

/** POST — uploads selected local documents to an existing provider draft. Never sends. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let draftId = "";
  try {
    const resolved = await params;
    draftId = resolved.id;

    // Dry-run validates everything but never contacts Gmail/Outlook and never
    // mutates EmailDraft metadata or uploads anything.
    const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";

    const body = await request.json().catch(() => ({}));
    const provider = body?.provider as ProviderValue;
    const documentIds: string[] = Array.isArray(body?.documentIds) ? body.documentIds : [];

    // Shared, side-effect-free validation (request-level + per-document).
    const vr = await validateProviderAttachmentRequest({ draftId, provider, documentIds });
    if (!vr.ok) {
      return NextResponse.json({ error: vr.error }, { status: vr.httpStatus });
    }
    const { providerKey, label, meta, providerDrafts } = vr;
    const draft = vr.draft as DraftContent;
    const providerDraft = (vr.providerDraft as ProviderDraftRecord) || {};
    const existing = (vr.existing as { documentId: string }[]) || [];

    // Load + verify the connector. Dry-run does not require a live connection.
    const account = await prisma.connectorAccount.findFirst({ where: { provider } });
    if (!dryRun && (!account || account.status !== "connected")) {
      return NextResponse.json(
        { error: `${label} Draft connector is not connected. Reconnect it in Settings.` },
        { status: 400 }
      );
    }

    if (!dryRun) {
      await logAudit("provider_attachment_upload_started", "EmailDraft", draftId, {
        provider,
        documentIds,
      });
    }

    // Split validated outcomes into uploadable docs and reported blocks. In real
    // mode, emit the per-block audit logs / notifications.
    const blockedResults: { documentId: string; name?: string; status: string; sizeClass?: string; uploadMode?: string }[] = [];
    const toUpload: {
      documentId: string;
      name?: string;
      size?: number;
      contentType?: string;
      uploadMode?: string;
      sizeClass?: string;
    }[] = [];

    for (const o of vr.outcomes!) {
      if (o.status === "ok") {
        toUpload.push({
          documentId: o.documentId,
          name: o.name,
          size: o.size,
          contentType: o.contentType,
          uploadMode: o.uploadMode,
          sizeClass: o.sizeClass,
        });
        continue;
      }
      blockedResults.push({
        documentId: o.documentId,
        name: o.name,
        status: o.status,
        sizeClass: o.sizeClass,
        uploadMode: o.uploadMode,
      });
      if (!dryRun) {
        if (o.status === "already_attached") {
          await logAudit("provider_attachment_duplicate_blocked", "EmailDraft", draftId, { provider, documentId: o.documentId });
        } else if (o.status === "too_large") {
          await logAudit("provider_attachment_too_large_blocked", "EmailDraft", draftId, { provider, documentId: o.documentId, size: o.size });
          await notify("Attachment exceeds 150 MB limit", `"${o.name || o.documentId}" is larger than 150 MB and cannot be attached.`, "warning", draftId);
        } else if (o.status === "deferred") {
          await logAudit("gmail_large_attachment_deferred", "EmailDraft", draftId, { provider, documentId: o.documentId, size: o.size });
          await notify("Gmail large attachment upload deferred", `"${o.name || o.documentId}" is over 3 MB. Large Gmail attachments are deferred — attach it manually in Gmail, or use Outlook upload sessions.`, "warning", draftId);
        } else if (o.status === "blocked_type") {
          await logAudit("provider_attachment_type_blocked", "EmailDraft", draftId, { provider, documentId: o.documentId });
        } else if (o.status === "missing_file") {
          await logAudit("provider_attachment_missing_file", "EmailDraft", draftId, { provider, documentId: o.documentId });
        }
      }
    }

    // Dry-run: report what would happen, including size class + upload mode.
    if (dryRun) {
      await logAudit("provider_attachment_dry_run_completed", "EmailDraft", draftId, {
        provider,
        wouldUpload: toUpload.length,
        selected: documentIds.length,
      });
      return NextResponse.json({
        dryRun: true,
        provider,
        connectorConnected: account?.status === "connected",
        providerSupport: PROVIDER_SUPPORT,
        wouldUpload: toUpload.map((u) => ({
          documentId: u.documentId,
          name: u.name,
          size: u.size,
          contentType: u.contentType,
          sizeClass: u.sizeClass,
          uploadMode: u.uploadMode,
        })),
        results: blockedResults,
        message:
          "Dry-run validation only. Personal Assist did not contact Gmail or Outlook, " +
          "did not upload anything, and did not modify the draft.",
      });
    }

    // Nothing valid to upload — return the per-document outcomes.
    if (toUpload.length === 0) {
      return NextResponse.json({
        success: false,
        provider,
        results: blockedResults,
        message: "No new attachments were uploaded.",
      });
    }

    // Upload to the provider draft.
    const accessToken = await getValidAccessToken(account, provider);
    const uploadedAt = new Date().toISOString();
    const results: { documentId: string; name?: string; status: string; error?: string }[] = [...blockedResults];
    const newRecords: { documentId: string; filename?: string; size?: number; contentType?: string; uploadedAt?: string; providerAttachmentId?: string | null; status: string; uploadMode?: string; sizeClass?: string; error?: string }[] = [];
    let usedUploadSession = false;

    if (provider === "gmail_draft") {
      // Gmail draft update replaces the message, so rebuild with existing + new
      // attachments and the original approved draft content. (All gmail uploads
      // here are small/simple — large gmail files are reported as deferred above.)
      const preserved: { filename: string; contentType: string; content: Buffer }[] = [];
      for (const rec of existing) {
        const loaded = await loadDocBuffer(rec.documentId);
        if (loaded) preserved.push({ filename: loaded.doc.originalName, contentType: loaded.doc.mimeType, content: loaded.buffer });
      }

      const fresh: { u: { documentId: string; name?: string; size?: number; contentType?: string; uploadMode?: string; sizeClass?: string; }; doc: { originalName: string; mimeType: string }; buffer: Buffer }[] = [];
      for (const u of toUpload) {
        const loaded = await loadDocBuffer(u.documentId);
        if (loaded) fresh.push({ u, doc: loaded.doc, buffer: loaded.buffer });
      }

      await updateGmailDraftWithAttachments(
        accessToken,
        providerDraft.draftId!,
        { to: draft.to, cc: draft.cc, bcc: draft.bcc, subject: draft.subject, body: draft.body },
        [...preserved, ...fresh.map((f) => ({ filename: f.doc.originalName, contentType: f.doc.mimeType, content: f.buffer }))]
      );

      for (const f of fresh) {
        newRecords.push({
          documentId: f.u.documentId,
          filename: f.doc.originalName,
          size: f.buffer.length,
          contentType: f.doc.mimeType,
          uploadedAt,
          providerAttachmentId: null,
          status: "attached",
          uploadMode: "simple",
          sizeClass: "small",
        });
        results.push({ documentId: f.u.documentId, name: f.doc.originalName, status: "attached" });
      }
      await logAudit("gmail_provider_attachment_uploaded", "EmailDraft", draftId, {
        count: fresh.length,
        filenames: fresh.map((f) => f.doc.originalName),
      });
    } else {
      // Outlook: simple upload for small files, upload sessions for large files.
      for (const u of toUpload) {
        const loaded = await loadDocBuffer(u.documentId);
        if (!loaded) {
          await logAudit("provider_attachment_missing_file", "EmailDraft", draftId, { provider, documentId: u.documentId });
          results.push({ documentId: u.documentId, name: u.name, status: "missing_file" });
          continue;
        }
        const { doc, buffer } = loaded;
        try {
          if (u.uploadMode === "upload_session") {
            await logAudit("provider_large_attachment_upload_started", "EmailDraft", draftId, { provider, documentId: u.documentId, size: buffer.length });
            await logAudit("outlook_large_attachment_session_created", "EmailDraft", draftId, { documentId: u.documentId });
            const { attachmentId, chunks } = await attachLargeFileToOutlookDraft(accessToken, providerDraft.messageId!, {
              name: doc.originalName,
              contentType: doc.mimeType,
              content: buffer,
            });
            await logAudit("outlook_large_attachment_chunk_uploaded", "EmailDraft", draftId, { documentId: u.documentId, chunks });
            await logAudit("outlook_large_attachment_uploaded", "EmailDraft", draftId, { documentId: u.documentId });
            usedUploadSession = true;
            newRecords.push({
              documentId: u.documentId,
              filename: doc.originalName,
              size: buffer.length,
              contentType: doc.mimeType,
              uploadedAt,
              providerAttachmentId: attachmentId || null,
              status: "attached",
              uploadMode: "upload_session",
              sizeClass: "large",
            });
            results.push({ documentId: u.documentId, name: doc.originalName, status: "attached" });
          } else {
            const { attachmentId } = await attachFileToOutlookDraft(accessToken, providerDraft.messageId!, {
              name: doc.originalName,
              contentType: doc.mimeType,
              contentBytes: buffer.toString("base64"),
            });
            newRecords.push({
              documentId: u.documentId,
              filename: doc.originalName,
              size: buffer.length,
              contentType: doc.mimeType,
              uploadedAt,
              providerAttachmentId: attachmentId || null,
              status: "attached",
              uploadMode: "simple",
              sizeClass: "small",
            });
            results.push({ documentId: u.documentId, name: doc.originalName, status: "attached" });
          }
        } catch (e: unknown) {
          const err = e as Error;
          const failAction = u.uploadMode === "upload_session" ? "provider_large_attachment_upload_failed" : "provider_attachment_upload_failed";
          await logAudit(failAction, "EmailDraft", draftId, { provider, documentId: u.documentId, error: err?.message });
          if (u.uploadMode === "upload_session") {
            await notify("Large attachment upload failed", `Could not upload "${doc.originalName}" to your Outlook draft: ${err?.message || "Unknown error"}.`, "error", draftId);
          }
          newRecords.push({
            documentId: u.documentId,
            filename: doc.originalName,
            size: buffer.length,
            contentType: doc.mimeType,
            uploadedAt,
            status: "failed",
            uploadMode: u.uploadMode,
            error: err?.message,
          });
          results.push({ documentId: u.documentId, name: doc.originalName, status: "failed", error: err?.message });
        }
      }
      if (newRecords.some((r) => r.status === "attached")) {
        await logAudit("outlook_provider_attachment_uploaded", "EmailDraft", draftId, {
          count: newRecords.filter((r) => r.status === "attached").length,
          filenames: newRecords.filter((r) => r.status === "attached").map((r) => r.filename),
        });
      }
    }

    // Update EmailDraft metadata.
    const updatedProviderDraft = {
      ...providerDraft,
      attachments: [...existing, ...newRecords],
      attachmentStatus: "attached",
      attachmentsUpdatedAt: uploadedAt,
    };
    const updatedMeta = {
      ...meta,
      providerDrafts: { ...providerDrafts, [providerKey!]: updatedProviderDraft },
    };
    await prisma.emailDraft.update({
      where: { id: draftId },
      data: { metadata: stringifyMetadata(updatedMeta) },
    });

    await logAudit("provider_attachment_upload_completed", "EmailDraft", draftId, {
      provider,
      attached: newRecords.filter((r) => r.status === "attached").length,
    });

    const attachedCount = newRecords.filter((r) => r.status === "attached").length;
    if (attachedCount > 0) {
      if (usedUploadSession) {
        await notify(
          "Large attachment uploaded to Outlook draft",
          `${attachedCount} attachment(s) added to your Outlook draft for "${draft.subject}" (large files via upload session). Review and send manually from Outlook.`,
          "success",
          draftId
        );
      } else {
        await notify(
          `Attachment uploaded to ${label} draft`,
          `${attachedCount} attachment(s) added to your ${label} draft for "${draft.subject}". Review and send manually from ${label}.`,
          "success",
          draftId
        );
      }
    }

    // Return safe attachment metadata only (no paths, tokens, or file bytes).
    return NextResponse.json({
      success: attachedCount > 0,
      provider,
      attached: attachedCount,
      results,
      message: `Attachments updated on your ${label} draft. Personal Assist does not send emails — review and send manually from ${label}.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Provider attachment upload failed", err?.message);
    await logAudit("provider_attachment_upload_failed", "EmailDraft", draftId || "unknown", {
      error: err?.message,
    });
    if (draftId) {
      await notify(
        "Attachment upload failed",
        `Could not upload attachments: ${err?.message || "Unknown error"}.`,
        "error",
        draftId
      );
    }
    return NextResponse.json(
      { error: err?.message || "Failed to upload attachments." },
      { status: 502 }
    );
  }
}
