import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFile } from "@/lib/storage";
import { logAudit } from "@/lib/audit";

const safeInlineMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv"
];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return new NextResponse("Document ID required", { status: 400 });
    }

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) {
      await logAudit("document_file_missing", "Document", id);
      return new NextResponse("Document not found", { status: 404 });
    }

    // The document.filename stores the internal storage key
    const buffer = await getFile(document.filename);

    if (!buffer) {
      await logAudit("document_file_missing", "Document", id, { filename: document.filename });
      return new NextResponse("File content not found", { status: 404 });
    }

    const mimeType = document.mimeType || "application/octet-stream";
    const isSafeInline = safeInlineMimeTypes.includes(mimeType.toLowerCase());
    
    // Create safe content disposition
    const safeOriginalName = document.originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const disposition = isSafeInline 
      ? `inline; filename="${safeOriginalName}"`
      : `attachment; filename="${safeOriginalName}"`;

    await logAudit("document_file_served", "Document", id, { filename: document.filename, inline: isSafeInline });

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": disposition,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error: unknown) {
    console.error("Error serving document file:", error);
    await logAudit("document_file_access_failed", "System", "download", { details: (error as Error).message });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
