import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "gmail" }
    });

    if (!account) {
      return NextResponse.json({ error: "No Gmail account connected" }, { status: 400 });
    }

    await prisma.connectorAccount.update({
      where: { id: account.id },
      data: {
        status: "disconnected",
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiry: null
      }
    });

    await logAudit("gmail_disconnected", "ConnectorAccount", account.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Gmail disconnect error", error);
    return NextResponse.json({ error: "Failed to disconnect Gmail" }, { status: 500 });
  }
}
