import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "outlook_draft" },
    });

    // Remove tokens for the draft connector only; read-only outlook_mail is untouched.
    await prisma.connectorAccount.deleteMany({
      where: { provider: "outlook_draft" },
    });

    await logAudit(
      "outlook_draft_disconnected",
      "ConnectorAccount",
      account?.id || "outlook_draft",
      { details: "Removed Outlook Draft tokens." }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Outlook Draft disconnect error", error);
    return NextResponse.json(
      { error: "Failed to disconnect Outlook Draft" },
      { status: 500 }
    );
  }
}
