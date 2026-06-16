"use server";

import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai/provider";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function generateDocumentEdit(documentId: string, actionType: string) {
  try {
    const ai = await getAIProvider();

    // Find the latest extracted text or original version
    const latestVersion = await prisma.documentVersion.findFirst({
      where: { documentId, type: { in: ['extracted_text', 'original'] } },
      orderBy: { versionNumber: 'desc' }
    });

    if (!latestVersion || !latestVersion.content) {
      throw new Error("No extracted text found to edit.");
    }

    let editedContent = "";
    if (actionType === "make_professional") {
      editedContent = await ai.editDocument(latestVersion.content, "Rewrite this document to sound more professional and formal.");
    } else if (actionType === "make_shorter") {
      editedContent = await ai.editDocument(latestVersion.content, "Rewrite this document to be significantly shorter and concise.");
    } else if (actionType === "extract_obligations") {
      editedContent = await ai.editDocument(latestVersion.content, "Extract all key obligations and requirements.");
    } else if (actionType === "extract_deadlines") {
      editedContent = await ai.editDocument(latestVersion.content, "Extract all deadlines and important dates.");
    } else if (actionType === "extract_payment_terms") {
      editedContent = await ai.editDocument(latestVersion.content, "Extract all payment terms, amounts, and due dates.");
    } else if (actionType === "find_risks") {
      editedContent = await ai.editDocument(latestVersion.content, "Find any risky clauses, liabilities, or unusual terms.");
    } else {
      editedContent = await ai.editDocument(latestVersion.content, `Perform this action: ${actionType}`);
    }

    // Instead of creating a final version immediately, we might just return it to the UI for redlining.
    // Or we store it as a temporary proposed_edit version. For simplicity, we can store it as 'edited_text' but with a "draft" status in metadata.
    const currentMaxVersion = await prisma.documentVersion.aggregate({
      where: { documentId },
      _max: { versionNumber: true }
    });
    
    const nextVersionNum = (currentMaxVersion._max.versionNumber || 0) + 1;

    const newVersion = await prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: nextVersionNum,
        type: 'edited_text',
        title: `Edit: ${actionType.replace(/_/g, ' ')}`,
        content: editedContent,
        createdBy: 'ai_provider',
        metadata: JSON.stringify({ actionType, originalVersionId: latestVersion.id, status: 'proposed' })
      }
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'edited' }
    });

    await logAudit("document_edit_generated", "Document", documentId, { versionId: newVersion.id, actionType });
    revalidatePath(`/documents/${documentId}`);
    
    return { success: true, versionId: newVersion.id, content: editedContent };
  } catch (error: unknown) {
    console.error("Failed to generate document edit:", error);
    return { success: false, error: (error as Error)?.message || "Unknown error" };
  }
}

export async function acceptDocumentEdit(documentId: string, versionId: string) {
  try {
    const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new Error("Version not found.");

    const meta = version.metadata ? JSON.parse(version.metadata) : {};
    meta.status = 'accepted';

    await prisma.documentVersion.update({
      where: { id: versionId },
      data: { metadata: JSON.stringify(meta) }
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'needs_signature' } // example next state
    });

    await logAudit("document_change_accepted", "Document", documentId, { versionId });
    revalidatePath(`/documents/${documentId}`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message || "Unknown error" }; }
}

export async function rejectDocumentEdit(documentId: string, versionId: string) {
  try {
    const version = await prisma.documentVersion.findUnique({ where: { id: versionId } });
    if (!version) throw new Error("Version not found.");

    const meta = version.metadata ? JSON.parse(version.metadata) : {};
    meta.status = 'rejected';

    await prisma.documentVersion.update({
      where: { id: versionId },
      data: { metadata: JSON.stringify(meta) }
    });

    await logAudit("document_change_rejected", "Document", documentId, { versionId });
    revalidatePath(`/documents/${documentId}`);
    return { success: true };
  } catch (error: unknown) { return { success: false, error: (error as Error)?.message || "Unknown error" }; }
}
