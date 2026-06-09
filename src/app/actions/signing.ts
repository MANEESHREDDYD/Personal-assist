"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function addSigner(documentId: string, name: string, email: string, role?: string, signingOrder: number = 1) {
  try {
    const signer = await prisma.documentSigner.create({
      data: { documentId, name, email, role, signingOrder, status: 'pending' }
    });
    await logAudit("signer_added", "Document", documentId, { signerId: signer.id, email });
    revalidatePath(`/documents/${documentId}`);
    return { success: true, signer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function removeSigner(documentId: string, signerId: string) {
  try {
    // Delete associated signature fields first
    await prisma.signatureField.deleteMany({ where: { signerId } });
    await prisma.documentSigner.delete({ where: { id: signerId } });
    await logAudit("signer_removed", "Document", documentId, { signerId });
    revalidatePath(`/documents/${documentId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addSignatureField(documentId: string, signerId: string, type: string, label: string, pageNumber: number = 1) {
  try {
    const field = await prisma.signatureField.create({
      data: { documentId, signerId, type, label, pageNumber, isRequired: true }
    });
    await logAudit("signature_field_added", "Document", documentId, { fieldId: field.id });
    revalidatePath(`/documents/${documentId}`);
    return { success: true, field };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createMockSigningRequest(documentId: string) {
  try {
    const signers = await prisma.documentSigner.findMany({ where: { documentId } });
    if (signers.length === 0) throw new Error("No signers added.");

    const fields = await prisma.signatureField.findMany({ where: { documentId, isRequired: true } });
    if (fields.length === 0) throw new Error("No required signature fields added.");

    // Update signers to sent
    await prisma.documentSigner.updateMany({
      where: { documentId, status: 'pending' },
      data: { status: 'sent' }
    });

    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'signature_requested' }
    });

    await prisma.notification.create({
      data: {
        title: "Signature Request Sent",
        message: `Mock signature request created for document.`,
        type: "signature_requested",
        severity: "info",
        status: "unread",
        relatedEntityType: "Document",
        relatedEntityId: documentId
      }
    });

    for (const signer of signers) {
      if (signer.status === 'pending') {
        await prisma.followUp.create({
          data: {
            title: `Wait for signature from ${signer.name}`,
            reason: `Signer needs to sign document`,
            status: "pending",
            priority: "high",
            source: "document",
            dueDate: new Date(Date.now() + 86400000 * 3) // 3 days
          }
        });
      }
    }

    await logAudit("mock_signing_request_created", "Document", documentId, {});
    revalidatePath(`/documents/${documentId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function simulateSignerViewed(signerId: string, documentId: string) {
  try {
    await prisma.documentSigner.update({
      where: { id: signerId },
      data: { status: 'viewed' }
    });
    await logAudit("mock_signer_viewed", "Document", documentId, { signerId });
    revalidatePath(`/documents/${documentId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function simulateSignerSigned(signerId: string, documentId: string) {
  try {
    await prisma.documentSigner.update({
      where: { id: signerId },
      data: { status: 'signed', signedAt: new Date() }
    });

    await logAudit("mock_signer_signed", "Document", documentId, { signerId });

    // Check if fully signed
    const allSigners = await prisma.documentSigner.findMany({ where: { documentId } });
    const allSigned = allSigners.every(s => s.status === 'signed');

    if (allSigned) {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'completed' }
      });

      // Create signed mock version
      const currentMaxVersion = await prisma.documentVersion.aggregate({
        where: { documentId },
        _max: { versionNumber: true }
      });
      const nextVersionNum = (currentMaxVersion._max.versionNumber || 0) + 1;

      await prisma.documentVersion.create({
        data: {
          documentId,
          versionNumber: nextVersionNum,
          type: 'signed_mock',
          title: 'Fully Signed Document',
          createdBy: 'system',
          content: 'This document has been fully signed in the local mock environment.'
        }
      });

      await logAudit("document_fully_signed", "Document", documentId, {});
      
      await prisma.notification.create({
        data: {
          title: "Document Fully Signed",
          message: `All signers have signed the document.`,
          type: "document_completed",
          severity: "success",
          status: "unread",
          relatedEntityType: "Document",
          relatedEntityId: documentId
        }
      });
    } else {
      await prisma.document.update({
        where: { id: documentId },
        data: { status: 'partially_signed' }
      });
    }

    revalidatePath(`/documents/${documentId}`);
    return { success: true, allSigned };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function simulateSignerDeclined(signerId: string, documentId: string, reason: string = "Declined in mock") {
  try {
    await prisma.documentSigner.update({
      where: { id: signerId },
      data: { status: 'declined', declinedReason: reason }
    });

    await logAudit("mock_signer_declined", "Document", documentId, { signerId, reason });
    
    await prisma.notification.create({
        data: {
          title: "Signer Declined",
          message: `A signer declined the document.`,
          type: "signer_declined",
          severity: "error",
          status: "unread",
          relatedEntityType: "Document",
          relatedEntityId: documentId
        }
      });

    revalidatePath(`/documents/${documentId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
