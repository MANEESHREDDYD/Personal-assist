import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseMetadata, stringifyMetadata } from "@/lib/metadata";
import { getFile } from "@/lib/storage";
import {
  MAX_PROVIDER_ATTACHMENT_SIZE,
  isBlockedExtension,
  isSafeStoredFilename,
  getLinkedDocumentIds,
} from "@/lib/attachments";
import { getValidAccessToken } from "@/lib/integrations/draftTokens";
import { updateGmailDraftWithAttachments } from "@/lib/integrations/gmailDraft";
import { attachFileToOutlookDraft } from "@/lib/integrations/outlookDraft";

export const dynamic = "force-dynamic";

type ProviderValue = "gmail_draft" | "outlook_draft";
const PROVIDER_KEY: Record<ProviderValue, "gmail" | "outlook"> = {
  gmail_draft: "gmail",
  outlook_draft: "outlook",
};
const PROVIDER_LABEL: Record<ProviderValue, string> = {
  gmail_draft: "Gmail",
  outlook_draft: "Outlook",
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

// Loads a Document and its file buffer, applying all Phase 3I validation.
// Returns either { doc, buffer } or { error } with a reason code. Never throws,
// and never returns local absolute paths.
async function loadValidatedDocument(documentId: string, linkedIds: string[]) {
  if (!linkedIds.includes(documentId)) {
    return { error: "not_linked" as const };
  }
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return { error: "not_found" as const };

  const filename = path.basename(doc.path || "");
  if (!filename || !isSafeStoredFilename(filename)) {
    return { error: "missing_file" as const, doc };
  }
  if (isBlockedExtension(doc.originalName) || isBlockedExtension(filename)) {
    return { error: "blocked_type" as const, doc };
  }

  const buffer = await getFile(filename);
  if (!buffer) return { error: "missing_file" as const, doc };

  if (buffer.length > MAX_PROVIDER_ATTACHMENT_SIZE) {
    return { error: "too_large" as const, doc };
  }

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
    const providerDrafts = meta.providerDrafts || {};
    const linkedIds = getLinkedDocumentIds(draft, meta);

    const gmailAttached: string[] = (providerDrafts.gmail?.attachments || []).map((a: any) => a.documentId);
    const outlookAttached: string[] = (providerDrafts.outlook?.attachments || []).map((a: any) => a.documentId);

    const docs = linkedIds.length
      ? await prisma.document.findMany({ where: { id: { in: linkedIds } } })
      : [];

    const documents = docs.map((d) => {
      const filename = path.basename(d.path || "");
      const blocked = isBlockedExtension(d.originalName) || isBlockedExtension(filename);
      const tooLarge = (d.size || 0) > MAX_PROVIDER_ATTACHMENT_SIZE;
      return {
        id: d.id,
        name: d.originalName,
        size: d.size,
        contentType: d.mimeType,
        blocked,
        tooLarge,
        attachedGmail: gmailAttached.includes(d.id),
        attachedOutlook: outlookAttached.includes(d.id),
      };
    });

    return NextResponse.json({
      approved: draft.status === "approved",
      hasGmailDraft: !!providerDrafts.gmail,
      hasOutlookDraft: !!providerDrafts.outlook,
      maxSize: MAX_PROVIDER_ATTACHMENT_SIZE,
      documents,
    });
  } catch (error: any) {
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

    const body = await request.json().catch(() => ({}));
    const provider = body?.provider as ProviderValue;
    const documentIds: string[] = Array.isArray(body?.documentIds) ? body.documentIds : [];

    if (provider !== "gmail_draft" && provider !== "outlook_draft") {
      return NextResponse.json({ error: "Invalid provider." }, { status: 400 });
    }
    if (documentIds.length === 0) {
      return NextResponse.json({ error: "No documents selected." }, { status: 400 });
    }
    const providerKey = PROVIDER_KEY[provider];
    const label = PROVIDER_LABEL[provider];

    // 1-2. Load draft, verify approved.
    const draft = await prisma.emailDraft.findUnique({ where: { id: draftId } });
    if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    if (draft.status !== "approved") {
      return NextResponse.json(
        { error: "Draft must be approved before attaching to a provider draft." },
        { status: 400 }
      );
    }

    const meta = parseMetadata(draft.metadata);
    const providerDrafts = meta.providerDrafts || {};
    const providerDraft = providerDrafts[providerKey];

    // 3. Verify provider draft exists.
    if (!providerDraft) {
      return NextResponse.json(
        { error: `No ${label} provider draft exists yet. Create the provider draft first.` },
        { status: 400 }
      );
    }

    // 6. Load + verify the connector.
    const account = await prisma.connectorAccount.findFirst({ where: { provider } });
    if (!account || account.status !== "connected") {
      return NextResponse.json(
        { error: `${label} Draft connector is not connected. Reconnect it in Settings.` },
        { status: 400 }
      );
    }

    await logAudit("provider_attachment_upload_started", "EmailDraft", draftId, {
      provider,
      documentIds,
    });

    const linkedIds = getLinkedDocumentIds(draft, meta);
    const existing: any[] = providerDraft.attachments || [];
    const existingDocIds = new Set(existing.map((a) => a.documentId));

    const results: any[] = [];
    const newRecords: any[] = [];
    const toUpload: { doc: any; buffer: Buffer }[] = [];

    // 4-5. Validate each selected document.
    for (const documentId of documentIds) {
      if (existingDocIds.has(documentId)) {
        await logAudit("provider_attachment_duplicate_blocked", "EmailDraft", draftId, {
          provider,
          documentId,
        });
        results.push({ documentId, status: "already_attached" });
        continue;
      }

      const loaded = await loadValidatedDocument(documentId, linkedIds);
      if ("error" in loaded) {
        const reason = loaded.error;
        const name = loaded.doc?.originalName || documentId;
        if (reason === "too_large") {
          await logAudit("provider_attachment_size_blocked", "EmailDraft", draftId, { provider, documentId });
          await notify("Attachment too large for Phase 3I", `"${name}" exceeds the 3 MB limit. Large attachment upload is planned for Phase 3J.`, "warning", draftId);
          results.push({ documentId, name, status: "too_large" });
        } else if (reason === "blocked_type") {
          await logAudit("provider_attachment_type_blocked", "EmailDraft", draftId, { provider, documentId });
          results.push({ documentId, name, status: "blocked_type" });
        } else if (reason === "missing_file") {
          await logAudit("provider_attachment_missing_file", "EmailDraft", draftId, { provider, documentId });
          results.push({ documentId, name, status: "missing_file" });
        } else {
          results.push({ documentId, name, status: reason });
        }
        continue;
      }
      toUpload.push(loaded);
    }

    // Nothing valid to upload — return the per-document outcomes.
    if (toUpload.length === 0) {
      return NextResponse.json({
        success: false,
        provider,
        results,
        message: "No new attachments were uploaded.",
      });
    }

    // 8. Upload to the provider draft.
    const accessToken = await getValidAccessToken(account, provider);
    const uploadedAt = new Date().toISOString();

    if (provider === "gmail_draft") {
      // Gmail draft update replaces the message, so rebuild with existing + new
      // attachments and the original approved draft content.
      const preserved: { filename: string; contentType: string; content: Buffer }[] = [];
      for (const rec of existing) {
        const prevDoc = await prisma.document.findUnique({ where: { id: rec.documentId } });
        if (!prevDoc) continue;
        const fn = path.basename(prevDoc.path || "");
        if (!isSafeStoredFilename(fn)) continue;
        const buf = await getFile(fn);
        if (buf) preserved.push({ filename: prevDoc.originalName, contentType: prevDoc.mimeType, content: buf });
      }

      const fresh = toUpload.map(({ doc, buffer }) => ({
        filename: doc.originalName,
        contentType: doc.mimeType,
        content: buffer,
      }));

      await updateGmailDraftWithAttachments(
        accessToken,
        providerDraft.draftId,
        { to: draft.to, cc: draft.cc, bcc: draft.bcc, subject: draft.subject, body: draft.body },
        [...preserved, ...fresh]
      );

      for (const { doc, buffer } of toUpload) {
        newRecords.push({
          documentId: doc.id,
          filename: doc.originalName,
          size: buffer.length,
          contentType: doc.mimeType,
          uploadedAt,
          providerAttachmentId: null,
          status: "attached",
        });
        results.push({ documentId: doc.id, name: doc.originalName, status: "attached" });
      }
      await logAudit("gmail_provider_attachment_uploaded", "EmailDraft", draftId, {
        count: newRecords.length,
        filenames: newRecords.map((r) => r.filename),
      });
    } else {
      // Outlook attachments are added incrementally; upload only the new files.
      for (const { doc, buffer } of toUpload) {
        try {
          const { attachmentId } = await attachFileToOutlookDraft(accessToken, providerDraft.messageId, {
            name: doc.originalName,
            contentType: doc.mimeType,
            contentBytes: buffer.toString("base64"),
          });
          newRecords.push({
            documentId: doc.id,
            filename: doc.originalName,
            size: buffer.length,
            contentType: doc.mimeType,
            uploadedAt,
            providerAttachmentId: attachmentId || null,
            status: "attached",
          });
          results.push({ documentId: doc.id, name: doc.originalName, status: "attached" });
        } catch (e: any) {
          await logAudit("provider_attachment_upload_failed", "EmailDraft", draftId, {
            provider,
            documentId: doc.id,
            error: e?.message,
          });
          newRecords.push({
            documentId: doc.id,
            filename: doc.originalName,
            size: buffer.length,
            contentType: doc.mimeType,
            uploadedAt,
            status: "failed",
            error: e?.message,
          });
          results.push({ documentId: doc.id, name: doc.originalName, status: "failed" });
        }
      }
      if (newRecords.some((r) => r.status === "attached")) {
        await logAudit("outlook_provider_attachment_uploaded", "EmailDraft", draftId, {
          count: newRecords.filter((r) => r.status === "attached").length,
          filenames: newRecords.filter((r) => r.status === "attached").map((r) => r.filename),
        });
      }
    }

    // 9. Update EmailDraft metadata.
    const updatedProviderDraft = {
      ...providerDraft,
      attachments: [...existing, ...newRecords],
      attachmentStatus: "attached",
      attachmentsUpdatedAt: uploadedAt,
    };
    const updatedMeta = {
      ...meta,
      providerDrafts: { ...providerDrafts, [providerKey]: updatedProviderDraft },
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
      await notify(
        `Attachment uploaded to ${label} draft`,
        `${attachedCount} attachment(s) added to your ${label} draft for "${draft.subject}". Review and send manually from ${label}.`,
        "success",
        draftId
      );
    }

    // 12. Return safe attachment metadata only (no paths, tokens, or file bytes).
    return NextResponse.json({
      success: attachedCount > 0,
      provider,
      attached: attachedCount,
      results,
      message: `Attachments updated on your ${label} draft. Personal Assist does not send emails — review and send manually from ${label}.`,
    });
  } catch (error: any) {
    console.error("Provider attachment upload failed", error?.message);
    await logAudit("provider_attachment_upload_failed", "EmailDraft", draftId || "unknown", {
      error: error?.message,
    });
    if (draftId) {
      await notify(
        "Attachment upload failed",
        `Could not upload attachments: ${error?.message || "Unknown error"}.`,
        "error",
        draftId
      );
    }
    return NextResponse.json(
      { error: error?.message || "Failed to upload attachments." },
      { status: 502 }
    );
  }
}
