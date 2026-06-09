import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const isConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
  const isRedirectConfigured = !!process.env.MICROSOFT_OUTLOOK_MAIL_REDIRECT_URI;
  
  let encryptionKeyPresent = false;
  if (process.env.ENCRYPTION_KEY) {
    let buffer = Buffer.from(process.env.ENCRYPTION_KEY, "base64");
    if (buffer.length !== 32) {
      buffer = Buffer.from(process.env.ENCRYPTION_KEY, "utf-8");
    }
    if (buffer.length === 32) encryptionKeyPresent = true;
  }

  const account = await prisma.connectorAccount.findFirst({
    where: { provider: "outlook_mail" }
  });

  return NextResponse.json({
    configured: isConfigured,
    redirectConfigured: isRedirectConfigured,
    encryptionKeyPresent,
    connected: account?.status === "connected",
    email: account?.email,
    lastSyncAt: account?.lastSyncAt,
    lastError: account?.lastError
  });
}
