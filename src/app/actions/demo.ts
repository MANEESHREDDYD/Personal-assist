"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function resetDatabaseSafely() {
  try {
    // Only deleting user-generated demo data, leaving configurations and rules intact
    await prisma.walletCard.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.documentVersion.deleteMany({});
    await prisma.documentSigner.deleteMany({});
    await prisma.signatureField.deleteMany({});
    await prisma.approvalRequest.deleteMany({});
    await prisma.reminder.deleteMany({});
    await prisma.brief.deleteMany({});
    await prisma.inboxItem.deleteMany({});
    await prisma.calendarEvent.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.emailDraft.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.followUp.deleteMany({});

    await logAudit("demo_data_reset", "System", "manual", {});
    
    revalidatePath("/");
    revalidatePath("/automations");
    revalidatePath("/settings");

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function seedDemoNotifications() {
  try {
    await prisma.notification.createMany({
      data: [
        { title: "Review Complete", message: "Document 'MSA_Final.pdf' review completed.", type: "document_review", severity: "info", status: "unread" },
        { title: "Payment Processed", message: "Payment to AWS successful.", type: "payment", severity: "success", status: "unread" }
      ]
    });
    await logAudit("demo_data_generated", "Notification", "demo", {});
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function seedDemoApprovals() {
  try {
    const yesterday = new Date(Date.now() - 25 * 3600000);
    await prisma.approvalRequest.create({
      data: {
        actionType: "send_payment",
        description: "Send $5,000 to Vercel",
        status: "pending",
        createdAt: yesterday,
        updatedAt: yesterday
      }
    });
    await logAudit("demo_data_generated", "ApprovalRequest", "demo", {});
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function seedDemoCalendar() {
  try {
    const in1Hour = new Date(Date.now() + 3600000);
    await prisma.calendarEvent.create({
      data: {
        title: "Product Sync",
        description: "Weekly sync",
        startDate: in1Hour,
        endDate: new Date(in1Hour.getTime() + 1800000),
        source: "demo"
      }
    });
    await logAudit("demo_data_generated", "CalendarEvent", "demo", {});
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function seedDemoWorkflow() {
  try {
     const doc = await prisma.document.create({
       data: {
         filename: "NDA_Acme.pdf",
         originalName: "NDA_Acme.pdf",
         mimeType: "application/pdf",
         size: 15000,
         path: "/mock/NDA_Acme.pdf",
         status: "needs_signature",
         aiSummary: "Standard Mutual NDA"
       }
     });

     const fourDaysAgo = new Date(Date.now() - 4 * 86400000);

     await prisma.documentSigner.create({
       data: {
         documentId: doc.id,
         name: "Alice Partner",
         email: "alice@acmecorp.com",
         status: "sent",
         updatedAt: fourDaysAgo
       }
     });

     await logAudit("demo_data_generated", "Document", doc.id, {});
     revalidatePath("/");
     return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function generateDemoStockBrief() {
  try {
    const brief = await prisma.brief.create({
      data: {
        type: "stock_start",
        content: "### Markets open mixed today.\nTech stocks are rallying slightly. *Informational only. Not financial advice.*"
      }
    });
    await logAudit("demo_data_generated", "Brief", brief.id, {});
    revalidatePath("/");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function generateDemoDocumentScenario() {
  try {
    const doc = await prisma.document.create({
      data: {
        filename: "MSA_Final_v2.pdf",
        originalName: "MSA_Final_v2.pdf",
        mimeType: "application/pdf",
        size: 245000,
        path: "/mock/MSA_Final_v2.pdf",
        status: "needs_signature",
        aiSummary: "Master Services Agreement between us and Client Corp. Outlines $10,000 monthly retainer for 12 months."
      }
    });

    const fourDaysAgo = new Date(Date.now() - 4 * 86400000);
    const signer = await prisma.documentSigner.create({
      data: {
        documentId: doc.id,
        name: "Client Corp CEO",
        email: "ceo@clientcorp.com",
        status: "sent",
        updatedAt: fourDaysAgo
      }
    });

    await prisma.walletCard.create({
      data: {
        type: "document",
        title: "MSA Final v2",
        category: "Legal",
        status: "Pending Signature",
        metadata: JSON.stringify({ documentId: doc.id }),
        source: "Upload"
      }
    });

    await logAudit("demo_scenario_generated", "Scenario", "document_signing", {});
    revalidatePath("/");
    revalidatePath("/documents");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function generateDemoTravelScenario() {
  try {
    const in7Days = new Date(Date.now() + 7 * 86400000);
    await prisma.walletCard.create({
      data: {
        type: "travel",
        title: "Flight to London",
        category: "Travel",
        status: "Upcoming",
        date: in7Days,
        location: "LHR",
        metadata: JSON.stringify({ flightNumber: "BA112", pnr: "XYZ789" }),
        source: "Email Import"
      }
    });
    await prisma.walletCard.create({
      data: {
        type: "payment",
        title: "Hotel Deposit",
        category: "Travel",
        status: "Pending",
        date: in7Days,
        amount: 500,
        source: "Email Import"
      }
    });
    
    await logAudit("demo_scenario_generated", "Scenario", "travel_payment", {});
    revalidatePath("/");
    revalidatePath("/wallet");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function generateDemoStockScenario() {
  try {
    await prisma.walletCard.createMany({
      data: [
        { type: "stock", title: "MSFT", category: "Watchlist", status: "Watching", metadata: JSON.stringify({ reason: "Earnings report" }), source: "Manual" },
        { type: "stock", title: "GOOGL", category: "Watchlist", status: "Watching", metadata: JSON.stringify({ reason: "AI updates" }), source: "Manual" },
        { type: "stock", title: "AMZN", category: "Watchlist", status: "Watching", metadata: JSON.stringify({ reason: "Prime Day" }), source: "Manual" },
      ]
    });
    await logAudit("demo_scenario_generated", "Scenario", "stock_watchlist", {});
    revalidatePath("/");
    revalidatePath("/stocks");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function generateDemoInboxScenario() {
  try {
    await prisma.inboxItem.create({
      data: {
        subject: "Action Required: Project Apollo Budget",
        body: "Please review the attached budget for Project Apollo and confirm the $50k allocation by Friday.",
        sender: "finance@company.com",
        category: "Action Item",
        isProcessed: true,
        metadata: JSON.stringify({ extractedEntities: { amount: "$50,000", deadline: "Friday" } })
      }
    });

    await prisma.followUp.create({
      data: {
        title: "Review Project Apollo Budget",
        reason: "Requested by finance",
        status: "pending",
        priority: "high",
        source: "email"
      }
    });

    await logAudit("demo_scenario_generated", "Scenario", "inbox_followup", {});
    revalidatePath("/");
    revalidatePath("/inbox");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
