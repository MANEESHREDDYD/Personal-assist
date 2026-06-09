"use server";

import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai/provider";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function generateDashboardBrief(type: "daily_start" | "daily_end" | "stock_start" | "stock_end") {
  try {
    const ai = await getAIProvider();

    // Gather real context from DB
    const pendingApprovals = await prisma.approvalRequest.count({ where: { status: "pending" } });
    const documentsReview = await prisma.document.count({ where: { status: "needs_review" } });
    
    // Phase 2B Context
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const meetingsToday = await prisma.calendarEvent.count({
      where: {
        startDate: { gte: today, lte: endOfDay }
      }
    });

    const pendingReminders = await prisma.reminder.count({ where: { status: "pending" } });
    const pendingFollowUps = await prisma.followUp.count({ where: { status: "pending" } });
    const draftCount = await prisma.emailDraft.count({ where: { status: "draft" } });
    const unreadNotifs = await prisma.notification.count({ where: { status: "unread" } });
    const signatureRequested = await prisma.document.count({ where: { status: "signature_requested" }});
    const partiallySigned = await prisma.document.count({ where: { status: "partially_signed" }});

    const context = {
      pendingApprovals,
      documentsReview,
      meetings: meetingsToday,
      pendingReminders,
      pendingFollowUps,
      draftCount,
      unreadNotifs,
      signatureRequested,
      partiallySigned
    };

    const content = await ai.generateBrief(type, context);

    const brief = await prisma.brief.create({
      data: {
        type,
        content,
      },
    });

    await logAudit("brief_generated", "Brief", brief.id, { type });
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Failed to generate dashboard brief", error);
    return { success: false };
  }
}
