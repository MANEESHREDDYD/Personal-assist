import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "gmail_draft" },
    });

    // Remove tokens for the draft connector only; read-only gmail is untouched.
    await prisma.connectorAccount.deleteMany({
      where: { provider: "gmail_draft" },
    });

    await logAudit(
      "gmail_draft_disconnected",
      "ConnectorAccount",
      account?.id || "gmail_draft",
      { details: "Removed Gmail Draft tokens." }
    );

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Gmail Draft disconnect error", error);
    return NextResponse.json(
      { error: "Failed to disconnect Gmail Draft" },
      { status: 500 }
    );
  }
}
