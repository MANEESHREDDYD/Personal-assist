"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { getAIProvider } from "@/lib/ai/provider";

export async function createDraft(data: {
  type: string;
  to?: string;
  subject?: string;
  body?: string;
  relatedDocId?: string;
  relatedInboxId?: string;
  relatedCardId?: string;
}) {
  try {
    const ai = await getAIProvider();

    let finalBody = data.body || "";
    let finalSubject = data.subject || "New Draft";
    let aiGenerated = false;

    // Optional: Use AI to draft the body if it's empty and we have context
    if (!finalBody && data.relatedDocId) {
      const doc = await prisma.document.findUnique({ where: { id: data.relatedDocId }});
      if (doc && doc.aiSummary) {
        finalBody = `I am attaching ${doc.originalName} for your review.\n\nSummary:\n${doc.aiSummary}`;
        aiGenerated = true;
      }
    }

    const draft = await prisma.emailDraft.create({
      data: {
        type: data.type,
        to: data.to,
        subject: finalSubject,
        body: finalBody,
        status: "draft",
        relatedDocId: data.relatedDocId,
        relatedInboxId: data.relatedInboxId,
        relatedCardId: data.relatedCardId,
        aiGenerated
      }
    });

    // Automatically create an approval request for the draft
    await prisma.approvalRequest.create({
      data: {
        actionType: "Send Email",
        description: `Draft ready to send: ${finalSubject}`,
        status: "pending",
        metadata: JSON.stringify({ draftId: draft.id, riskLevel: "Medium" })
      }
    });

    await logAudit("draft_created", "EmailDraft", draft.id, { type: data.type });
    revalidatePath("/drafts");
    revalidatePath("/approvals");

    return { success: true, draftId: draft.id };
  } catch (error) {
    console.error("Failed to create draft", error);
    return { success: false, error: "Failed to create draft" };
  }
}

export async function updateDraftStatus(id: string, status: string) {
  try {
    const draft = await prisma.emailDraft.update({
      where: { id },
      data: { status }
    });

    await logAudit("draft_status_updated", "EmailDraft", id, { status });
    revalidatePath("/drafts");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to update draft", error);
    return { success: false };
  }
}
