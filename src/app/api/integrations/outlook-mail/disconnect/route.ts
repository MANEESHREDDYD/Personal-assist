import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function POST() {
  try {
    const account = await prisma.connectorAccount.findFirst({
      where: { provider: "outlook_mail" }
    });
    
    await prisma.connectorAccount.deleteMany({
      where: { provider: "outlook_mail" }
    });
    
    if (account) {
      await logAudit("outlook_mail_disconnected", "ConnectorAccount", account.id, { details: "Removed Outlook Mail tokens." });
    } else {
      await logAudit("outlook_mail_disconnected", "System", "oauth", { details: "Removed Outlook Mail tokens." });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
