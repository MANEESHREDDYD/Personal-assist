import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseMetadata } from "@/lib/metadata";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const draft = await prisma.emailDraft.findUnique({
      where: { id },
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const meta = parseMetadata(draft.metadata);
    const relatedDocIds = (meta.attachedDocumentIds as string[]) || [];
    let attachmentsList = "No attachments selected.";

    if (relatedDocIds.length > 0) {
      const docs = await prisma.document.findMany({
        where: { id: { in: relatedDocIds } }
      });
      if (docs.length > 0) {
        attachmentsList = docs.map(d => `- ${d.originalName}`).join("\n");
      }
    }

    let sourceContext = "Source: None";
    if (draft.relatedDocId) {
      const doc = await prisma.document.findUnique({ where: { id: draft.relatedDocId }});
      if (doc) sourceContext = `Source Document: ${doc.originalName}`;
    }

    const content = `=========================================
PERSONAL ASSIST LOCAL DRAFT EXPORT (TXT)
=========================================
Note: Personal Assist does not send emails. This draft is local only. 
You must manually copy the contents, attach the files below, and 
send from your own external email client.
Exported files may contain sensitive content. Store securely.
-----------------------------------------
Generated At: ${new Date().toISOString()}
Draft ID: ${draft.id}
${sourceContext}
-----------------------------------------

To: ${draft.to || ""}
CC: ${draft.cc || ""}
BCC: ${draft.bcc || ""}
Subject: ${draft.subject || ""}

MANUAL ATTACHMENT CHECKLIST:
${attachmentsList}

-----------------------------------------
MESSAGE BODY:
-----------------------------------------

${draft.body || ""}

=========================================
END OF DRAFT
=========================================`;

    // Log the action
    await logAudit("draft_txt_exported", "EmailDraft", draft.id, { 
      subject: draft.subject 
    });

    const filename = `draft_${draft.id.slice(0, 8)}.txt`;

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });

  } catch (error: any) {
    console.error("TXT Export Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
