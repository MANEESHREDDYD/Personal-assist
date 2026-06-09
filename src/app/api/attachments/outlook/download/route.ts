import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { fetchOutlookAttachment, refreshAccessToken } from "@/lib/integrations/outlookMail";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";
import { saveBuffer } from "@/lib/storage";
import { extractText } from "@/lib/documentExtraction";
import fs from "fs/promises";
import path from "path";

const BLOCKED_EXTENSIONS = [
  ".exe", ".bat", ".cmd", ".msi", ".scr", ".ps1", ".sh", ".app", ".dmg",
  ".com", ".vbs", ".vbe", ".js", ".jse", ".wsf", ".hta", ".jar", ".reg",
  ".lnk", ".url", ".apk", ".pkg"
];
const MAX_SIZE = 25 * 1024 * 1024; // 25 MB

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { inboxItemId, messageId, attachmentId } = body;

    if (!inboxItemId || !messageId || !attachmentId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const inboxItem = await prisma.inboxItem.findUnique({
      where: { id: inboxItemId }
    });

    if (!inboxItem || !inboxItem.metadata) {
      return NextResponse.json({ error: "InboxItem not found or missing metadata" }, { status: 404 });
    }

    const metadata = JSON.parse(inboxItem.metadata);
    if (metadata.provider !== "outlook_mail") {
      return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
    }

    const attachmentMeta = metadata.attachmentsMeta?.find((a: any) => a.id === attachmentId);
    if (!attachmentMeta) {
      return NextResponse.json({ error: "Attachment metadata not found" }, { status: 404 });
    }

    if (attachmentMeta.status === "downloaded" && attachmentMeta.localDocumentId) {
      return NextResponse.json({ 
        success: true, 
        message: "Already downloaded", 
        documentId: attachmentMeta.localDocumentId 
      });
    }

    const ext = path.extname(attachmentMeta.filename || "").toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      await logAudit("attachment_blocked_file_type", "InboxItem", inboxItemId, { filename: attachmentMeta.filename });
      return NextResponse.json({ error: "This attachment type is blocked in the local beta for safety." }, { status: 400 });
    }

    if (attachmentMeta.size > MAX_SIZE) {
      await logAudit("attachment_size_exceeded", "InboxItem", inboxItemId, { size: attachmentMeta.size });
      return NextResponse.json({ error: "File exceeds maximum size of 25 MB." }, { status: 400 });
    }

    await logAudit("attachment_download_started", "InboxItem", inboxItemId, { attachmentId });

    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "outlook_mail" }
    });

    if (!account || !account.accessTokenEncrypted) {
      return NextResponse.json({ error: "Outlook Mail account not connected" }, { status: 401 });
    }

    let accessToken = decryptToken(account.accessTokenEncrypted);
    let isExpired = false;
    if (account.lastSyncAt) {
      const msSinceSync = Date.now() - new Date(account.lastSyncAt).getTime();
      if (msSinceSync > 1000 * 60 * 50) isExpired = true; // 50 mins
    }

    if (isExpired && account.refreshTokenEncrypted) {
      const refreshToken = decryptToken(account.refreshTokenEncrypted);
      const tokenData = await refreshAccessToken(refreshToken);
      accessToken = tokenData.access_token;
      
      await prisma.connectorAccount.update({
        where: { id: account.id },
        data: {
          accessTokenEncrypted: encryptToken(accessToken),
          refreshTokenEncrypted: tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : account.refreshTokenEncrypted
        }
      });
    }

    const attachmentData = await fetchOutlookAttachment(accessToken, messageId, attachmentId);
    
    // Check if it's a file attachment vs item attachment
    if (attachmentData["@odata.type"] === "#microsoft.graph.itemAttachment") {
      return NextResponse.json({ error: "Unsupported attachment type for local download in this beta." }, { status: 400 });
    }

    if (!attachmentData.contentBytes) {
      throw new Error("Failed to retrieve attachment contentBytes");
    }

    const buffer = Buffer.from(attachmentData.contentBytes, "base64");
    if (buffer.length > MAX_SIZE) {
      await logAudit("attachment_size_exceeded", "InboxItem", inboxItemId, { decodedSize: buffer.length });
      return NextResponse.json({ error: "Decoded file exceeds maximum size of 25 MB." }, { status: 400 });
    }

    const localFilename = await saveBuffer(buffer, attachmentMeta.filename || "attachment.bin");

    const extractedText = await extractText(localFilename, attachmentMeta.contentType || "", attachmentMeta.filename || "");
    let textFilePath = null;
    let docMetadata: any = {
      source: "outlook_attachment",
      sourceProvider: "outlook_mail",
      sourceMessageId: messageId,
      sourceAttachmentId: attachmentId,
      sourceInboxItemId: inboxItemId,
      externalAttachmentKey: `outlook_mail:${messageId}:${attachmentId}`,
      originalFilename: attachmentMeta.filename,
      mimeType: attachmentMeta.contentType,
      size: buffer.length,
      downloadedAt: new Date().toISOString()
    };

    if (extractedText) {
      if (extractedText.length > 50000) {
        const UPLOADS_DIR = path.join(process.cwd(), "uploads");
        textFilePath = `${localFilename}.extracted.txt`;
        await fs.writeFile(path.join(UPLOADS_DIR, textFilePath), extractedText);
        docMetadata.extractedTextFile = textFilePath;
        await logAudit("document_extraction_completed", "InboxItem", inboxItemId, { size: extractedText.length, savedToFile: true });
      } else {
        docMetadata.extractedText = extractedText;
        await logAudit("document_extraction_completed", "InboxItem", inboxItemId, { size: extractedText.length });
      }
    } else {
      docMetadata.extractionStatus = "unavailable or failed";
      await logAudit("document_extraction_failed", "InboxItem", inboxItemId, { mimeType: attachmentMeta.contentType });
    }

    const doc = await prisma.document.create({
      data: {
        filename: localFilename,
        originalName: attachmentMeta.filename || "attachment.bin",
        mimeType: attachmentMeta.contentType || "application/octet-stream",
        size: buffer.length,
        path: `/api/files/${localFilename}`,
        status: "imported",
        notes: `Imported from Outlook Mail email: ${inboxItem.subject}\n\nMETADATA_JSON:${JSON.stringify(docMetadata)}`,
        aiSummary: "[Pending AI Summary]",
      }
    });

    attachmentMeta.status = "downloaded";
    attachmentMeta.localDocumentId = doc.id;
    attachmentMeta.downloadedAt = docMetadata.downloadedAt;
    attachmentMeta.localFilename = localFilename;

    const updatedMetadata = JSON.stringify(metadata);
    await prisma.inboxItem.update({
      where: { id: inboxItemId },
      data: { metadata: updatedMetadata }
    });

    await prisma.notification.create({
      data: {
        title: "Attachment imported to Documents",
        message: attachmentMeta.filename || "attachment.bin",
        type: "success"
      }
    });

    await logAudit("outlook_attachment_downloaded", "Document", doc.id, { inboxItemId, attachmentId });
    await logAudit("attachment_imported_to_documents", "Document", doc.id, { filename: doc.originalName });

    return NextResponse.json({ success: true, document: doc });

  } catch (error: any) {
    console.error("Outlook attachment download error:", error);
    await logAudit("attachment_download_failed", "System", "download", { details: error.message });
    return NextResponse.json({ error: error.message || "Failed to download attachment" }, { status: 500 });
  }
}
