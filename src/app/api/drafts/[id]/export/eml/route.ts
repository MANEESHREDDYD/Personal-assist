import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { parseMetadata } from "@/lib/metadata";

// Basic escape for headers
function escapeHeader(val: string) {
  return val.replace(/\r?\n|\r/g, " ").trim();
}

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
        attachmentsList = docs.map(d => `- ${d.originalName}`).join("\r\n");
      }
    }

    let sourceContext = "Source: None";
    if (draft.relatedDocId) {
      const doc = await prisma.document.findUnique({ where: { id: draft.relatedDocId }});
      if (doc) sourceContext = `Source Document: ${doc.originalName}`;
    }

    const dateHeader = new Date().toUTCString();
    
    // Construct EML
    let eml = `Date: ${dateHeader}\r\n`;
    eml += `To: ${escapeHeader(draft.to || "")}\r\n`;
    if (draft.cc) eml += `Cc: ${escapeHeader(draft.cc)}\r\n`;
    if (draft.bcc) eml += `Bcc: ${escapeHeader(draft.bcc)}\r\n`;
    eml += `Subject: ${escapeHeader(draft.subject || "")}\r\n`;
    eml += `Message-ID: <${draft.id}@personalassist.local>\r\n`;
    eml += `X-Personal-Assist-Draft-ID: ${draft.id}\r\n`;
    eml += `X-Personal-Assist-Local-Only: true\r\n`;
    eml += `X-Personal-Assist-No-Send: true\r\n`;
    eml += `Content-Type: text/plain; charset=utf-8\r\n\r\n`;

    const bodyPrefix = `[PERSONAL ASSIST LOCAL DRAFT]
This draft is local only and was NOT sent automatically.
You must manually review, attach files, and send from your own email client.

${sourceContext}

MANUAL ATTACHMENT CHECKLIST:
${attachmentsList}
--------------------------------------------------\r\n\r\n`;

    // Ensure CRLF for body
    const bodyText = (draft.body || "").replace(/\r?\n/g, "\r\n");

    eml += bodyPrefix + bodyText;

    // Log the action
    await logAudit("draft_eml_exported", "EmailDraft", draft.id, { 
      subject: draft.subject 
    });

    const filename = `draft_${draft.id.slice(0, 8)}.eml`;

    return new NextResponse(eml, {
      status: 200,
      headers: {
        "Content-Type": "message/rfc822",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    });

  } catch (error: unknown) {
    console.error("EML Export Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
