"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { saveFile, getFile } from "@/lib/storage";
import { revalidatePath } from "next/cache";
import { getAIProvider } from "@/lib/ai/provider";
import { extractText } from "@/lib/documentExtraction";
import fs from "fs/promises";
import path from "path";

export async function uploadDocument(formData: FormData) {
  try {
    const file = formData.get("file") as File;
    const notes = formData.get("notes") as string;
    
    if (!file || !file.name) {
      return { success: false, error: "No file provided" };
    }

    const filename = await saveFile(file);
    const extractedText = await extractText(filename, file.type, file.name);
    
    let textFilePath = null;
    let metadataObj: any = { filename };
    
    if (extractedText) {
      if (extractedText.length > 50000) {
        // Save to adjacent file
        const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
        textFilePath = `${filename}.extracted.txt`;
        await fs.writeFile(path.join(UPLOADS_DIR, textFilePath), extractedText);
        metadataObj.extractedTextFile = textFilePath;
      } else {
        metadataObj.extractedText = extractedText;
      }
    } else {
      metadataObj.extractionStatus = "unavailable or failed";
    }

    const doc = await prisma.document.create({
      data: {
        filename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        path: `data/uploads/${filename}`,
        status: "needs_review",
        notes,
        aiSummary: "[Pending AI Summary]",
      },
    });

    const ai = await getAIProvider();
    
    // Follow-Up Detection
    if (extractedText) {
      const followUp = await ai.detectFollowUps(extractedText);
      if (followUp.detected) {
        await prisma.reminder.create({
          data: {
            title: `Follow up on Document: ${file.name}`,
            description: followUp.reason || "Detected action required",
            status: "pending",
          }
        });
        await logAudit("followup_detected", "Document", doc.id, { reason: followUp.reason });
      }
    }

    const card = await prisma.walletCard.create({
      data: {
        type: "document",
        title: file.name,
        category: "Document",
        status: "Needs Review",
        metadata: JSON.stringify({ documentId: doc.id, ...metadataObj }),
        aiSummary: "[Pending AI Summary]",
      },
    });

    await logAudit("file_uploaded", "Document", doc.id, { filename: doc.filename });
    await logAudit("card_created", "WalletCard", card.id, { title: card.title });
    if (extractedText) {
      await logAudit("document_text_extracted", "Document", doc.id, { length: extractedText.length });
    }
    
    revalidatePath("/documents");
    revalidatePath("/wallet");
    revalidatePath("/");
    
    return { success: true, doc };
  } catch (error) {
    console.error("Failed to upload document", error);
    return { success: false, error: "Failed to upload document" };
  }
}

export async function mockSummarizeDocument(documentId: string) {
  try {
    const doc = await prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) return { success: false };

    const cards = await prisma.walletCard.findMany({ where: { type: "document" } });
    const card = cards.find(c => c.metadata && c.metadata.includes(documentId));
    let extractedText = "";

    if (card && card.metadata) {
      const meta = JSON.parse(card.metadata);
      if (meta.extractedText) extractedText = meta.extractedText;
      else if (meta.extractedTextFile) {
        const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
        try {
          extractedText = await fs.readFile(path.join(UPLOADS_DIR, meta.extractedTextFile), "utf-8");
        } catch(e) {}
      }
    }

    const ai = await getAIProvider();
    let summary = "[Mock AI] No text could be extracted.";
    if (extractedText) {
      summary = await ai.summarizeDocument(extractedText);
    }

    await prisma.document.update({
      where: { id: documentId },
      data: {
        aiSummary: summary,
        status: "reviewed",
      },
    });

    if (card) {
      await prisma.walletCard.update({
        where: { id: card.id },
        data: { aiSummary: summary, status: "Reviewed" }
      });
    }
    
    await logAudit("document_summarized", "Document", documentId, { status: "reviewed" });
    revalidatePath("/documents");
    revalidatePath("/wallet");
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function mockPrepareForSignature(documentId: string) {
  try {
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: "needs_signature",
        notes: "Prepared for signature via local simulation.",
      },
    });

    await logAudit("document_prepared_signature", "Document", documentId, { status: "needs_signature" });
    revalidatePath("/documents");
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function mockCreateApprovalRequest(documentId: string, docName: string) {
  try {
    const approval = await prisma.approvalRequest.create({
      data: {
        actionType: "Sign Document",
        description: `Apply signature to ${docName}`,
        status: "pending",
        metadata: JSON.stringify({ riskLevel: "Medium", documentId }),
      },
    });

    await logAudit("approval_requested", "ApprovalRequest", approval.id, { documentId });
    revalidatePath("/documents");
    revalidatePath("/approvals");
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}
