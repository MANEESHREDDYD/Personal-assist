"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function processApproval(id: string, status: string) {
  try {
    const req = await prisma.approvalRequest.findUnique({ where: { id } });
    if (!req) return { success: false };

    await prisma.approvalRequest.update({
      where: { id },
      data: { status },
    });

    if (req.metadata) {
      const meta = JSON.parse(req.metadata);
      
      // If it's a draft approval, sync status
      if (meta.draftId) {
        let draftStatus = "pending_approval";
        if (status === "approved") draftStatus = "approved";
        if (status === "denied" || status === "rejected") draftStatus = "rejected";
        if (status === "needs_changes") draftStatus = "needs_changes";

        await prisma.emailDraft.update({
          where: { id: meta.draftId },
          data: { status: draftStatus }
        });
        revalidatePath("/drafts");
      }
      
      // If it's a document signature approval
      if (status === "approved" && meta.documentId && req.actionType === "Sign Document") {
        await prisma.document.update({
          where: { id: meta.documentId },
          data: { status: "signed" }
        });
        revalidatePath("/documents");
      }

      // Phase 2C Approval Types
      if (status === "approved" && meta.documentId) {
        if (req.actionType === "final_document_edit") {
           // We might apply an edit to final here if needed
           await prisma.document.update({ where: { id: meta.documentId }, data: { status: "ready_for_signature" }});
        } else if (req.actionType === "prepare_signature_request") {
           await prisma.document.update({ where: { id: meta.documentId }, data: { status: "ready_for_signature" }});
        } else if (req.actionType === "archive_document") {
           await prisma.document.update({ where: { id: meta.documentId }, data: { status: "archived" }});
        } else if (req.actionType === "mark_document_completed") {
           await prisma.document.update({ where: { id: meta.documentId }, data: { status: "completed" }});
        }
        revalidatePath(`/documents/${meta.documentId}`);
      }
    }
    
    await logAudit("approval_status_updated", "ApprovalRequest", req.id, { 
      status, 
      actionType: req.actionType 
    });
    
    revalidatePath("/approvals");
    return { success: true };
  } catch (error) { console.error("Failed to process approval", error); return { success: false }; }
}

export async function generateMockApproval() {
  try {
    const req = await prisma.approvalRequest.create({
      data: {
        actionType: "Wire Transfer",
        description: "Initiate payment of $500 to Vendor.",
        status: "pending",
        metadata: JSON.stringify({ riskLevel: "High" })
      },
    });

    await logAudit("approval_requested", "ApprovalRequest", req.id, { 
      actionType: "Wire Transfer" 
    });

    revalidatePath("/approvals");
    return { success: true };
  } catch { return { success: false }; }
}
