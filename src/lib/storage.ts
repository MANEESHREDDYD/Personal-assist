import fs from "fs/promises";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure the directory exists
async function ensureDir() {
  try {
    await fs.access(UPLOADS_DIR);
  } catch {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  }
}

export async function saveFile(file: File): Promise<string> {
  await ensureDir();
  
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  
  await fs.writeFile(filepath, buffer);
  
  return filename;
}

export async function saveBuffer(buffer: Buffer, originalName: string): Promise<string> {
  await ensureDir();
  
  const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const filename = `${Date.now()}-${safeName}`;
  const filepath = path.join(UPLOADS_DIR, filename);
  
  await fs.writeFile(filepath, buffer);
  
  return filename;
}

export async function getFile(filename: string): Promise<Buffer | null> {
  try {
    const filepath = path.join(UPLOADS_DIR, filename);
    return await fs.readFile(filepath);
  } catch {
    return null;
  }
}

export async function getFilePath(filename: string): Promise<string> {
  return path.join(UPLOADS_DIR, filename);
}
