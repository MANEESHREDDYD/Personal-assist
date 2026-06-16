import { NextResponse } from "next/server";
import { prisma as db } from "@/lib/prisma";

export async function POST() {
  try {
    const account = await db.connectorAccount.findFirst({
      where: { provider: "outlook_calendar" }
    });

    if (!account) {
      return NextResponse.json({ success: true }); // Already disconnected
    }

    await db.connectorAccount.update({
      where: { id: account.id },
      data: {
        status: "disconnected",
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
        tokenExpiry: null,
      }
    });

    await db.auditLog.create({
      data: {
        action: "outlook_calendar_disconnected",
        entityType: "connector",
        entityId: "outlook_calendar"
      }
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
