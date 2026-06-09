import { getFile } from "@/lib/storage";
const pdfParse = require("pdf-parse");
import * as mammoth from "mammoth";

export async function extractTextFromBuffer(buffer: Buffer, mimeType: string, originalName: string): Promise<string | null> {
  try {
    const ext = originalName.split('.').pop()?.toLowerCase();
    
    if (mimeType === "application/pdf" || ext === "pdf") {
      const pdfData = await pdfParse(buffer);
      return pdfData.text;
    } 
    else if (mimeType.includes("wordprocessingml.document") || ext === "docx") {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    }
    else if (mimeType.includes("text") || ext === "txt" || ext === "md" || ext === "csv") {
      return buffer.toString("utf-8");
    }
  } catch (e) {
    console.error("Text extraction failed", e);
  }
  return null;
}

export async function extractText(filename: string, mimeType: string, originalName: string): Promise<string | null> {
  const buffer = await getFile(filename);
  if (!buffer) return null;
  return extractTextFromBuffer(buffer, mimeType, originalName);
}
