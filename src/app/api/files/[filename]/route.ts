import { NextRequest, NextResponse } from "next/server";
import { getFile } from "@/lib/storage";
// basic mime type map
const mimeTypes: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  
  if (!filename) {
    return new NextResponse("File not found", { status: 404 });
  }

  const buffer = await getFile(filename);

  if (!buffer) {
    return new NextResponse("File not found", { status: 404 });
  }

  const ext = filename.substring(filename.lastIndexOf(".")).toLowerCase();
  const contentType = mimeTypes[ext] || "application/octet-stream";

  return new NextResponse(buffer as unknown as BodyInit, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
