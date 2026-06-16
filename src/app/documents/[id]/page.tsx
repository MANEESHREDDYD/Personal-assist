import { prisma } from "@/lib/prisma";
import { ArrowLeft, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentWorkspaceClient } from "./DocumentWorkspaceClient";

export const dynamic = "force-dynamic";

export default async function DocumentDetailPage({ params }: { params: { id: string } }) {
  const document = await prisma.document.findUnique({
    where: { id: params.id }
  });

  if (!document) {
    notFound();
  }

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: document.id },
    orderBy: { versionNumber: "desc" }
  });

  const signers = await prisma.documentSigner.findMany({
    where: { documentId: document.id },
    orderBy: { signingOrder: "asc" }
  });

  const fields = await prisma.signatureField.findMany({
    where: { documentId: document.id }
  });

  let metadataObj: any = null;
  if (document.notes && document.notes.includes("METADATA_JSON:")) {
    try {
      const parts = document.notes.split("METADATA_JSON:");
      if (parts.length > 1) {
        metadataObj = JSON.parse(parts[1]);
      }
    } catch {
      // Ignore parse errors
    }
  }

  let sourceInboxItem = null;
  if (metadataObj && metadataObj.inboxItemId) {
    sourceInboxItem = await prisma.inboxItem.findUnique({
      where: { id: metadataObj.inboxItemId }
    });
  }

  const relatedDrafts = await prisma.emailDraft.findMany({
    where: { relatedDocId: document.id },
    orderBy: { createdAt: "desc" }
  });

  // Wallet cards might refer to this document in metadata
  const allCards = await prisma.walletCard.findMany({
    where: { type: "task" }
  });
  const relatedCards = allCards.filter(c => c.metadata && c.metadata.includes(document.id));

  // Followups might refer to this document in source
  const relatedFollowUps = await prisma.followUp.findMany({
    where: { source: "document", reason: { contains: document.id } } // Simplistic mapping, real app would use proper relation
  });

  // Approvals might have draft metadata
  const allApprovals = await prisma.approvalRequest.findMany();
  const relatedApprovals = allApprovals.filter(a => a.metadata && a.metadata.includes(document.id));

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-6">
        <Link href="/documents" className="text-sm text-zinc-400 hover:text-white flex items-center gap-2 w-fit mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Documents
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText className="text-blue-400" />
              {document.originalName}
            </h1>
            <p className="text-zinc-400">Manage document versions, edits, and mock signatures.</p>
            {metadataObj && metadataObj.source && (
              <div className="mt-3 flex items-center gap-2 text-sm text-zinc-400">
                <span className="px-2 py-1 bg-white/10 rounded border border-white/5 uppercase tracking-wider text-[10px] font-bold">
                  {metadataObj.source === "gmail_attachment" ? "Gmail Attachment" : 
                   metadataObj.source === "outlook_attachment" ? "Outlook Attachment" : metadataObj.source}
                </span>
                {metadataObj.sourceMessageId && (
                  <span>Message ID: {metadataObj.sourceMessageId}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <DocumentWorkspaceClient 
        document={document} 
        versions={versions}
        signers={signers}
        fields={fields}
        sourceInboxItem={sourceInboxItem}
        relatedDrafts={relatedDrafts}
        relatedCards={relatedCards}
        relatedFollowUps={relatedFollowUps}
        relatedApprovals={relatedApprovals}
        metadataObj={metadataObj}
      />
    </div>
  );
}
