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
    const finalSubject = data.subject || "New Draft";
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

export async function markDraftExported(id: string) {
  try {
    const draft = await prisma.emailDraft.findUnique({ where: { id } });
    if (!draft) return { success: false };

    const meta = draft.metadata ? JSON.parse(draft.metadata) : {};
    meta.exportStatus = "exported";
    meta.exportedAt = new Date().toISOString();

    await prisma.emailDraft.update({
      where: { id },
      data: { metadata: JSON.stringify(meta) }
    });

    await logAudit("draft_marked_exported", "EmailDraft", id);
    
    await prisma.notification.create({
      data: {
        title: "Draft Exported",
        message: `Draft "${draft.subject}" was exported manually.`,
        type: "draft_exported",
        severity: "info",
        status: "unread",
        relatedEntityType: "EmailDraft",
        relatedEntityId: id
      }
    });

    revalidatePath("/drafts");
    revalidatePath(`/documents/${draft.relatedDocId}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function markDraftManuallySent(id: string) {
  try {
    const draft = await prisma.emailDraft.findUnique({ where: { id } });
    if (!draft) return { success: false };

    const meta = draft.metadata ? JSON.parse(draft.metadata) : {};
    meta.exportStatus = "manually_sent";
    meta.sentOutsidePersonalAssist = true;
    meta.manuallySentAt = new Date().toISOString();

    await prisma.emailDraft.update({
      where: { id },
      data: { metadata: JSON.stringify(meta) }
    });

    await logAudit("draft_marked_manually_sent", "EmailDraft", id);

    await prisma.notification.create({
      data: {
        title: "Draft Manually Sent",
        message: `Draft "${draft.subject}" was marked as sent outside Personal Assist.`,
        type: "draft_sent",
        severity: "success",
        status: "unread",
        relatedEntityType: "EmailDraft",
        relatedEntityId: id
      }
    });

    revalidatePath("/drafts");
    revalidatePath(`/documents/${draft.relatedDocId}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

export async function reopenDraft(id: string) {
  try {
    const draft = await prisma.emailDraft.findUnique({ where: { id } });
    if (!draft) return { success: false };

    // Reset status to draft or approved
    const status = "draft"; 

    await prisma.emailDraft.update({
      where: { id },
      data: { status }
    });

    await logAudit("draft_reopened", "EmailDraft", id);
    revalidatePath("/drafts");
    return { success: true };
  } catch { return { success: false }; }
}

export async function logClipboardAction(id: string, actionName: string) {
  try {
    await logAudit(`draft_copied_${actionName}`, "EmailDraft", id);
    return { success: true };
  } catch {
    return { success: false };
  }
}
