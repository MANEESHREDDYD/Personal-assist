import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

export async function GET() {
  try {
    const hasClientId = !!process.env.MICROSOFT_CLIENT_ID;
    const hasEncryptionKey = !!process.env.ENCRYPTION_KEY;

    if (!hasClientId || !hasEncryptionKey) {
      return NextResponse.json({
        configured: hasClientId,
        encryptionKeyPresent: hasEncryptionKey,
        connected: false,
      });
    }

    const account = await db.connectorAccount.findFirst({
      where: { provider: "outlook_calendar" }
    });

    if (!account) {
      return NextResponse.json({
        configured: true,
        encryptionKeyPresent: true,
        connected: false,
      });
    }

    return NextResponse.json({
      configured: true,
      encryptionKeyPresent: true,
      connected: account.status === "connected",
      email: account.email,
      lastSyncAt: account.lastSyncAt,
      lastError: account.lastError,
      status: account.status
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
