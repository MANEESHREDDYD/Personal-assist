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
import {
  validateProviderAttachmentRequest,
  ProviderValue,
} from "@/lib/providerAttachments/validation";

export const dynamic = "force-dynamic";

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
    const { providerKey, label, draft, meta, providerDrafts, providerDraft, existing } = vr;

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
    const blockedResults: any[] = [];
    const toUpload: { documentId: string; name?: string; contentType?: string; buffer: Buffer }[] = [];

    for (const o of vr.outcomes!) {
      if (o.status === "ok" && o.buffer) {
        toUpload.push({ documentId: o.documentId, name: o.name, contentType: o.contentType, buffer: o.buffer });
        continue;
      }
      blockedResults.push({ documentId: o.documentId, name: o.name, status: o.status });
      if (!dryRun) {
        if (o.status === "already_attached") {
          await logAudit("provider_attachment_duplicate_blocked", "EmailDraft", draftId, { provider, documentId: o.documentId });
        } else if (o.status === "too_large") {
          await logAudit("provider_attachment_size_blocked", "EmailDraft", draftId, { provider, documentId: o.documentId });
          await notify("Attachment too large for Phase 3I", `"${o.name || o.documentId}" exceeds the 3 MB limit. Large attachment upload is planned for Phase 3J.`, "warning", draftId);
        } else if (o.status === "blocked_type") {
          await logAudit("provider_attachment_type_blocked", "EmailDraft", draftId, { provider, documentId: o.documentId });
        } else if (o.status === "missing_file") {
          await logAudit("provider_attachment_missing_file", "EmailDraft", draftId, { provider, documentId: o.documentId });
        }
      }
    }

    // Dry-run: report what would happen without contacting the provider or
    // mutating any state.
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
        wouldUpload: toUpload.map((u) => ({
          documentId: u.documentId,
          name: u.name,
          size: u.buffer.length,
          contentType: u.contentType,
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
    const results: any[] = [...blockedResults];
    const newRecords: any[] = [];

    if (provider === "gmail_draft") {
      // Gmail draft update replaces the message, so rebuild with existing + new
      // attachments and the original approved draft content.
      const preserved: { filename: string; contentType: string; content: Buffer }[] = [];
      for (const rec of existing!) {
        const prevDoc = await prisma.document.findUnique({ where: { id: rec.documentId } });
        if (!prevDoc) continue;
        const fn = path.basename(prevDoc.path || "");
        if (!isSafeStoredFilename(fn)) continue;
        const buf = await getFile(fn);
        if (buf) preserved.push({ filename: prevDoc.originalName, contentType: prevDoc.mimeType, content: buf });
      }

      const fresh = toUpload.map((u) => ({
        filename: u.name || "attachment",
        contentType: u.contentType || "application/octet-stream",
        content: u.buffer,
      }));

      await updateGmailDraftWithAttachments(
        accessToken,
        providerDraft.draftId,
        { to: draft.to, cc: draft.cc, bcc: draft.bcc, subject: draft.subject, body: draft.body },
        [...preserved, ...fresh]
      );

      for (const u of toUpload) {
        newRecords.push({
          documentId: u.documentId,
          filename: u.name,
          size: u.buffer.length,
          contentType: u.contentType,
          uploadedAt,
          providerAttachmentId: null,
          status: "attached",
        });
        results.push({ documentId: u.documentId, name: u.name, status: "attached" });
      }
      await logAudit("gmail_provider_attachment_uploaded", "EmailDraft", draftId, {
        count: newRecords.length,
        filenames: newRecords.map((r) => r.filename),
      });
    } else {
      // Outlook attachments are added incrementally; upload only the new files.
      for (const u of toUpload) {
        try {
          const { attachmentId } = await attachFileToOutlookDraft(accessToken, providerDraft.messageId, {
            name: u.name || "attachment",
            contentType: u.contentType || "application/octet-stream",
            contentBytes: u.buffer.toString("base64"),
          });
          newRecords.push({
            documentId: u.documentId,
            filename: u.name,
            size: u.buffer.length,
            contentType: u.contentType,
            uploadedAt,
            providerAttachmentId: attachmentId || null,
            status: "attached",
          });
          results.push({ documentId: u.documentId, name: u.name, status: "attached" });
        } catch (e: any) {
          await logAudit("provider_attachment_upload_failed", "EmailDraft", draftId, {
            provider,
            documentId: u.documentId,
            error: e?.message,
          });
          newRecords.push({
            documentId: u.documentId,
            filename: u.name,
            size: u.buffer.length,
            contentType: u.contentType,
            uploadedAt,
            status: "failed",
            error: e?.message,
          });
          results.push({ documentId: u.documentId, name: u.name, status: "failed" });
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
      attachments: [...existing!, ...newRecords],
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
      await notify(
        `Attachment uploaded to ${label} draft`,
        `${attachedCount} attachment(s) added to your ${label} draft for "${draft.subject}". Review and send manually from ${label}.`,
        "success",
        draftId
      );
    }

    // Return safe attachment metadata only (no paths, tokens, or file bytes).
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
