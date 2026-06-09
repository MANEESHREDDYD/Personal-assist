"use server";

import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai/provider";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs/promises";

// Helper to get text for intelligence tasks
async function getDocumentText(documentId: string): Promise<string | null> {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) return null;

  const cards = await prisma.walletCard.findMany({ where: { type: "document" } });
  const card = cards.find(c => c.metadata && c.metadata.includes(documentId));

  let extractedText = "";

  if (card && card.metadata) {
    const meta = JSON.parse(card.metadata);
    if (meta.extractedText) {
      extractedText = meta.extractedText;
    } else if (meta.extractedTextFile) {
      const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");
      try {
        extractedText = await fs.readFile(path.join(UPLOADS_DIR, meta.extractedTextFile), "utf-8");
      } catch (e) {
        console.error("Failed to read text file:", e);
      }
    }
  }

  return extractedText || null;
}

export async function extractDocumentProperties(documentId: string, property: "action_items" | "deadlines" | "parties" | "payment_terms" | "signatures" | "risks") {
  try {
    const text = await getDocumentText(documentId);
    if (!text) return { success: false, error: "No text available for extraction." };

    const ai = await getAIProvider();
    await logAudit("document_intelligence_started", "Document", documentId, { task: property });

    let result: any = null;

    switch (property) {
      case "action_items":
        result = await ai.extractActionItems(text);
        await logAudit("document_action_items_extracted", "Document", documentId, { count: result.length });
        break;
      case "deadlines":
        result = await ai.extractDeadlines(text);
        await logAudit("document_deadlines_extracted", "Document", documentId, { count: result.length });
        break;
      case "parties":
        result = await ai.extractParties(text);
        await logAudit("document_parties_extracted", "Document", documentId, { count: result.length });
        break;
      case "payment_terms":
        result = await ai.extractPaymentTerms(text);
        await logAudit("document_payment_terms_extracted", "Document", documentId, { terms: result });
        break;
      case "signatures":
        result = await ai.extractSignatureRequirements(text);
        await logAudit("document_signature_requirements_extracted", "Document", documentId, { reqs: result });
        break;
      case "risks":
        result = await ai.identifyRisks(text);
        await logAudit("document_risks_identified", "Document", documentId, { count: result.length });
        break;
    }

    // Emit notification
    await prisma.notification.create({
      data: {
        title: `Intelligence Task Complete`,
        message: `Extracted ${property} for document`,
        type: "document_review",
        severity: "info",
        status: "unread",
        relatedEntityType: "Document",
        relatedEntityId: documentId,
      }
    });

    revalidatePath(`/documents/${documentId}`);
    return { success: true, result };
  } catch (error) {
    console.error(`Failed to extract ${property}:`, error);
    await logAudit("document_intelligence_failed", "Document", documentId, { task: property });
    return { success: false, error: "AI extraction failed." };
  }
}

export async function generateDocumentDraft(documentId: string, draftType: string, sourceInboxItemId?: string) {
  try {
    const text = await getDocumentText(documentId);
    if (!text) return { success: false, error: "No text available to generate draft." };

    const ai = await getAIProvider();
    await logAudit("document_intelligence_started", "Document", documentId, { task: `generate_draft_${draftType}` });

    const draftContent = await ai.generateDraftFromDocument(text, draftType);
    const risks = await ai.identifyRisks(text);
    
    // Assign risk levels
    let riskLevel = "low";
    if (draftType === "signature_request") riskLevel = "medium";
    if (risks.some(r => r.toLowerCase().includes("penalty") || r.toLowerCase().includes("liability") || r.toLowerCase().includes("high-risk"))) {
      riskLevel = "high";
    }

    const doc = await prisma.document.findUnique({ where: { id: documentId } });

    const metadata = {
      sourceDocumentId: documentId,
      sourceInboxItemId: sourceInboxItemId || null,
      attachedDocumentIds: [documentId],
      attachmentMode: "local_reference",
      sourceProvider: doc?.notes?.includes("Gmail") ? "gmail" : (doc?.notes?.includes("Outlook") ? "outlook_mail" : "manual_upload"),
      generatedFrom: "document_intelligence",
      draftType,
      riskLevel,
      riskReasons: risks,
      approvalStatus: "pending",
      generatedAt: new Date().toISOString()
    };

    let finalStatus = "draft";
    let needsApproval = false;

    if (draftType === "signature_request" || riskLevel === "medium" || riskLevel === "high") {
      finalStatus = "pending_approval";
      needsApproval = true;
    }

    const draft = await prisma.emailDraft.create({
      data: {
        type: "document_send",
        subject: draftContent.subject,
        body: draftContent.body,
        status: finalStatus,
        relatedDocId: documentId,
        aiGenerated: true,
        metadata: JSON.stringify(metadata) // Store extra data here
      }
    });

    if (needsApproval) {
      await prisma.approvalRequest.create({
        data: {
          actionType: "Send Email",
          description: `Generated Draft: ${draft.subject} (Risk: ${riskLevel})`,
          status: "pending",
          metadata: JSON.stringify({ draftId: draft.id, documentId, riskLevel, riskReasons: risks })
        }
      });
      await logAudit("document_draft_sent_to_approval", "EmailDraft", draft.id, { riskLevel });
      await prisma.notification.create({
        data: {
          title: "Draft Needs Approval",
          message: `A generated draft requires approval before it can be copied or used.`,
          type: "document_review",
          severity: "warning",
          status: "unread",
          relatedEntityType: "EmailDraft",
          relatedEntityId: draft.id,
        }
      });
    }

    await logAudit("document_draft_created", "EmailDraft", draft.id, { draftType });
    revalidatePath(`/documents/${documentId}`);
    revalidatePath("/drafts");
    revalidatePath("/approvals");

    return { success: true, draft };
  } catch (error) {
    console.error("Failed to generate draft:", error);
    await logAudit("document_intelligence_failed", "Document", documentId, { task: "generate_draft" });
    return { success: false, error: "Failed to generate draft." };
  }
}

export async function createExtractedReminder(documentId: string, date: string, description: string) {
  try {
    const parsedDate = new Date(date);
    const reminder = await prisma.reminder.create({
      data: {
        title: `Deadline: ${description.slice(0, 50)}`,
        description: `Extracted from Document ID: ${documentId}`,
        dueDate: isNaN(parsedDate.getTime()) ? new Date(Date.now() + 86400000) : parsedDate,
        status: "pending"
      }
    });
    await logAudit("document_reminder_created", "Reminder", reminder.id, { documentId });
    revalidatePath(`/documents/${documentId}`);
    return { success: true, reminder };
  } catch (e) {
    return { success: false };
  }
}

export async function createExtractedFollowUp(documentId: string, actionItem: string) {
  try {
    const fu = await prisma.followUp.create({
      data: {
        title: `Action: ${actionItem.slice(0, 50)}`,
        reason: actionItem,
        source: "document",
        status: "pending",
        dueDate: new Date(Date.now() + 86400000)
      }
    });
    await logAudit("document_followup_created", "FollowUp", fu.id, { documentId });
    revalidatePath(`/documents/${documentId}`);
    return { success: true, fu };
  } catch (e) {
    return { success: false };
  }
}

export async function createExtractedWalletCard(documentId: string, title: string, content: string) {
  try {
    const card = await prisma.walletCard.create({
      data: {
        type: "task",
        title: `Note: ${title.slice(0, 30)}`,
        category: "Extracted Insight",
        status: "Active",
        metadata: JSON.stringify({ documentId, content })
      }
    });
    await logAudit("document_wallet_card_created", "WalletCard", card.id, { documentId });
    revalidatePath(`/documents/${documentId}`);
    revalidatePath("/wallet");
    return { success: true, card };
  } catch (e) {
    return { success: false };
  }
}
