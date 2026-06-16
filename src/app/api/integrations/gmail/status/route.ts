import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "gmail" }
    });

    const isEnvConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    
    // Test if ENCRYPTION_KEY works
    let isEncryptionKeyValid = false;
    if (process.env.ENCRYPTION_KEY) {
      try {
        let buffer = Buffer.from(process.env.ENCRYPTION_KEY, "base64");
        if (buffer.length !== 32) {
          buffer = Buffer.from(process.env.ENCRYPTION_KEY, "utf-8");
        }
        if (buffer.length === 32) isEncryptionKeyValid = true;
      } catch {
        // invalid
      }
    }

    if (!account) {
      return NextResponse.json({
        configured: isEnvConfigured,
        encryptionKeyValid: isEncryptionKeyValid,
        status: "not_configured"
      });
    }

    return NextResponse.json({
      configured: isEnvConfigured,
      encryptionKeyValid: isEncryptionKeyValid,
      status: account.status,
      email: account.email,
      lastSyncAt: account.lastSyncAt,
      lastError: account.lastError
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch status" }, { status: 500 });
  }
}
