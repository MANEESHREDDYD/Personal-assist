import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = {
      walletCards: await prisma.walletCard.findMany(),
      documents: await prisma.document.findMany(),
      inboxItems: await prisma.inboxItem.findMany(),
      approvalRequests: await prisma.approvalRequest.findMany(),
      reminders: await prisma.reminder.findMany(),
      briefs: await prisma.brief.findMany(),
      auditLogs: await prisma.auditLog.findMany(),
      calendarEvents: await prisma.calendarEvent.findMany(),
      contacts: await prisma.contact.findMany(),
      followUps: await prisma.followUp.findMany(),
      emailDrafts: await prisma.emailDraft.findMany(),
      notifications: await prisma.notification.findMany(),
      exportDate: new Date().toISOString(),
      version: "2.0",
    };

    const jsonString = JSON.stringify(data, null, 2);

    await logAudit("data_exported", "System", "manual", { byteSize: jsonString.length });
    
    await prisma.userPreference.upsert({
      where: { key: "lastExportAt" },
      update: { value: new Date().toISOString() },
      create: { key: "lastExportAt", value: new Date().toISOString() }
    });

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="personal-assist-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export failed", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
