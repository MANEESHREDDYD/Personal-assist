import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const isConfigured = !!(
      process.env.GOOGLE_GMAIL_DRAFT_CLIENT_ID &&
      process.env.GOOGLE_GMAIL_DRAFT_CLIENT_SECRET
    );
    const isRedirectConfigured = !!process.env.GOOGLE_GMAIL_DRAFT_REDIRECT_URI;

    let encryptionKeyPresent = false;
    if (process.env.ENCRYPTION_KEY) {
      try {
        let buffer = Buffer.from(process.env.ENCRYPTION_KEY, "base64");
        if (buffer.length !== 32) {
          buffer = Buffer.from(process.env.ENCRYPTION_KEY, "utf-8");
        }
        if (buffer.length === 32) encryptionKeyPresent = true;
      } catch {
        // invalid key
      }
    }

    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "gmail_draft" },
    });

    return NextResponse.json({
      configured: isConfigured,
      redirectConfigured: isRedirectConfigured,
      encryptionKeyPresent,
      connected: account?.status === "connected",
      email: account?.email,
      lastError: account?.lastError,
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
