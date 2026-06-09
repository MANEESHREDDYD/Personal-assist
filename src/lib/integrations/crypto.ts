import crypto from "crypto";

// Ensure ENCRYPTION_KEY is exactly 32 bytes if provided as a raw string,
// or if it's base64, we decode it. For simplicity, we assume it's a 32-byte base64 string
// or a 32-character string.
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY is missing in environment variables.");
  
  // Try treating it as a base64 string
  let buffer = Buffer.from(key, "base64");
  if (buffer.length !== 32) {
    // If not valid base64 32 bytes, fall back to ascii
    buffer = Buffer.from(key, "utf-8");
  }
  
  if (buffer.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 bytes long (or a valid 32-byte base64 string).");
  }
  return buffer;
}

const ALGORITHM = "aes-256-cbc";

export function encryptToken(text: string): string {
  if (!text) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return "";
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");
  if (parts.length !== 2) throw new Error("Invalid encrypted token format");
  const iv = Buffer.from(parts[0], "hex");
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
