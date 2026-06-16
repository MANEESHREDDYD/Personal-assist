import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function runAutomations() {
  console.log(`[Automation Engine] Running at ${new Date().toISOString()}`);

  const rules = await prisma.automationRule.findMany({
    where: {
      enabled: true,
      OR: [
        { nextRunAt: { lte: new Date() } },
        { nextRunAt: null }
      ]
    }
  });

  if (rules.length === 0) {
    console.log(`[Automation Engine] No rules due to run.`);
    return;
  }

  for (const rule of rules) {
    console.log(`[Automation Engine] Executing rule: ${rule.name}`);
    let success = false;
    let errorMessage = "";
    let summary = "";

    try {
      if (rule.triggerType === "reminder_due") summary = await executeReminderDue();
      else if (rule.triggerType === "payment_due_soon") summary = await executePaymentDueSoon();
      else if (rule.triggerType === "signer_not_signed") summary = await executeSignerFollowUp();
      else if (rule.triggerType === "approval_pending_too_long") summary = await executeApprovalAging();
      else if (rule.triggerType === "travel_upcoming") summary = await executeTravelUpcoming();
      else if (rule.triggerType === "calendar_event_upcoming") summary = await executeCalendarEventUpcoming();
      else if (rule.triggerType === "followup_due") summary = await executeFollowUpDue();
      else if (rule.triggerType === "daily_brief_time") summary = await executeDailyBriefTime();
      else if (rule.triggerType === "end_of_day_brief_time") summary = await executeEndOfDayBriefTime();
      else if (rule.triggerType === "stock_open_brief_time") summary = await executeStockBrief("stock_start");
      else if (rule.triggerType === "stock_close_brief_time") summary = await executeStockBrief("stock_end");
      else if (rule.triggerType === "weekly_backup_reminder") summary = await executeWeeklyBackupReminder();
      else {
        summary = `No handler implemented for trigger: ${rule.triggerType}`;
      }

      success = true;
    } catch (e: unknown) {
      const err = e as Error;
      console.error(`[Automation Engine] Rule ${rule.name} failed:`, err);
      errorMessage = err?.message || "Unknown error";
    }

    // Determine next run time. 
    // For time-based triggers like briefs, we calculate the next occurrence.
    // For general polling triggers, we just set it to run in 5 minutes, or null so it runs continually if condition matched.
    // Actually, to prevent spam, we can set nextRunAt based on rule type.
    const nextRun = calculateNextRun(rule.triggerType);

    await prisma.automationRun.create({
      data: {
        ruleId: rule.id,
        status: success ? "success" : "failed",
        resultSummary: summary,
        errorMessage: errorMessage || null,
        completedAt: new Date()
      }
    });

    await prisma.automationRule.update({
      where: { id: rule.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: nextRun,
        runCount: { increment: 1 }
      }
    });

    if (success && summary && summary !== "No action needed") {
        await logAudit("automation_run_completed", "AutomationRule", rule.id, { summary, ruleName: rule.name });
    }
  }
}

function calculateNextRun(triggerType: string): Date | null {
  const now = new Date();
  if (triggerType.includes("_brief_time") || triggerType === "weekly_backup_reminder") {
    // Basic implementation: check again in 5 minutes. The actual logic in the handler checks if it already ran today.
    return new Date(now.getTime() + 5 * 60000);
  }
  // For continuous polling (e.g. reminders due), we check every minute, so we can just leave it as null
  return null;
}

export async function createNotificationIfNotExists(args: {
  title: string;
  message: string;
  type: string;
  severity: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  dedupeKey: string;
}) {
  const now = new Date();
  // We can use metadata to store the dedupe key
  const existing = await prisma.notification.findFirst({
    where: {
       message: { contains: args.dedupeKey },
       createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // don't repeat within 24h
    }
  });

  if (existing) return false;

  await prisma.notification.create({
    data: {
      title: args.title,
      message: `${args.message} [id:${args.dedupeKey}]`, // embedding key in message to avoid schema change
      type: args.type,
      severity: args.severity,
      status: "unread",
      relatedEntityType: args.relatedEntityType,
      relatedEntityId: args.relatedEntityId
    }
  });
  return true;
}

// Handlers
async function executeReminderDue() {
  const due = await prisma.reminder.findMany({
    where: { status: "pending", dueDate: { lte: new Date() } }
  });
  let count = 0;
  for (const r of due) {
    const created = await createNotificationIfNotExists({
      title: "Reminder Due",
      message: `Reminder "${r.title}" is due now.`,
      type: "reminder_due",
      severity: "warning",
      relatedEntityType: "Reminder",
      relatedEntityId: r.id,
      dedupeKey: `reminder_due_${r.id}`
    });
    if (created) count++;
  }
  return count > 0 ? `Created ${count} reminder notifications` : "No action needed";
}

async function executePaymentDueSoon() {
  const in3Days = new Date(Date.now() + 3 * 86400000);
  const due = await prisma.walletCard.findMany({
    where: { type: "payment", status: "Pending", date: { lte: in3Days, gte: new Date() } }
  });
  let count = 0;
  for (const p of due) {
    const created = await createNotificationIfNotExists({
      title: "Payment Due Soon",
      message: `Payment "${p.title}" ($${p.amount}) is due soon.`,
      type: "payment_due",
      severity: "warning",
      relatedEntityType: "WalletCard",
      relatedEntityId: p.id,
      dedupeKey: `payment_due_${p.id}`
    });
    if (created) count++;
  }
  return count > 0 ? `Created ${count} payment notifications` : "No action needed";
}

async function executeSignerFollowUp() {
  const limitDate = new Date(Date.now() - 3 * 86400000); // 3 days ago
  const signers = await prisma.documentSigner.findMany({
    where: { status: { in: ['sent', 'viewed'] }, updatedAt: { lte: limitDate } }
  });
  let count = 0;
  for (const s of signers) {
    const created = await createNotificationIfNotExists({
      title: "Signer Pending",
      message: `Signer ${s.name} has not signed after 3 days.`,
      type: "signer_pending",
      severity: "warning",
      relatedEntityType: "Document",
      relatedEntityId: s.documentId,
      dedupeKey: `signer_pending_${s.id}`
    });
    if (created) {
       await prisma.followUp.create({
         data: {
           title: `Follow up with ${s.name} regarding document signature`,
           reason: `Pending for 3+ days`,
           status: "pending",
           priority: "high",
           source: "document"
         }
       });
       count++;
    }
  }
  return count > 0 ? `Created ${count} signer follow-ups/notifications` : "No action needed";
}

async function executeApprovalAging() {
  const limitDate = new Date(Date.now() - 86400000); // 24 hours ago
  const approvals = await prisma.approvalRequest.findMany({
    where: { status: "pending", createdAt: { lte: limitDate } }
  });
  let count = 0;
  for (const a of approvals) {
    const created = await createNotificationIfNotExists({
      title: "Approval Aging",
      message: `Approval request "${a.actionType}" pending for >24h.`,
      type: "approval_aging",
      severity: "error",
      relatedEntityType: "ApprovalRequest",
      relatedEntityId: a.id,
      dedupeKey: `approval_aging_${a.id}`
    });
    if (created) count++;
  }
  return count > 0 ? `Created ${count} approval aging notifications` : "No action needed";
}

async function executeTravelUpcoming() {
  const in24Hours = new Date(Date.now() + 86400000);
  const travel = await prisma.walletCard.findMany({
    where: { type: "travel", status: "Upcoming", date: { lte: in24Hours, gte: new Date() } }
  });
  let count = 0;
  for (const t of travel) {
    const created = await createNotificationIfNotExists({
      title: "Upcoming Travel",
      message: `Your travel "${t.title}" is coming up in less than 24 hours.`,
      type: "travel_upcoming",
      severity: "info",
      relatedEntityType: "WalletCard",
      relatedEntityId: t.id,
      dedupeKey: `travel_upcoming_${t.id}`
    });
    if (created) count++;
  }
  return count > 0 ? `Created ${count} travel notifications` : "No action needed";
}

async function executeCalendarEventUpcoming() {
  const in30Mins = new Date(Date.now() + 30 * 60000);
  const events = await prisma.calendarEvent.findMany({
    where: { startDate: { lte: in30Mins, gte: new Date() } }
  });
  let count = 0;
  for (const e of events) {
    const created = await createNotificationIfNotExists({
      title: "Meeting Upcoming",
      message: `Event "${e.title}" starts soon.`,
      type: "calendar_upcoming",
      severity: "info",
      relatedEntityType: "CalendarEvent",
      relatedEntityId: e.id,
      dedupeKey: `calendar_upcoming_${e.id}`
    });
    if (created) count++;
  }
  return count > 0 ? `Created ${count} calendar notifications` : "No action needed";
}

async function executeFollowUpDue() {
  const due = await prisma.followUp.findMany({
    where: { status: "pending", dueDate: { lte: new Date() } }
  });
  let count = 0;
  for (const f of due) {
    const created = await createNotificationIfNotExists({
      title: "Follow-Up Due",
      message: `Follow-up "${f.title}" is due.`,
      type: "followup_due",
      severity: "warning",
      relatedEntityType: "FollowUp",
      relatedEntityId: f.id,
      dedupeKey: `followup_due_${f.id}`
    });
    if (created) count++;
  }
  return count > 0 ? `Created ${count} follow-up notifications` : "No action needed";
}

async function executeWeeklyBackupReminder() {
  const now = new Date();
  if (now.getDay() === 0 && now.getHours() === 10) { // Sunday 10am
     const created = await createNotificationIfNotExists({
        title: "Backup Recommended",
        message: "Weekly local backup recommended. Click Export Now in Settings.",
        type: "backup_reminder",
        severity: "info",
        dedupeKey: `weekly_backup_${now.toDateString()}`
     });
     return created ? "Created backup reminder" : "No action needed";
  }
  return "No action needed";
}

// Brief Generators
import { generateDashboardBrief } from "@/app/actions/dashboard";

async function executeDailyBriefTime() {
  const now = new Date();
  if (now.getHours() === 8) { // 8 AM
    const created = await createNotificationIfNotExists({
        title: "Daily Life Brief Ready",
        message: "Your Daily Life Brief has been generated.",
        type: "brief_ready",
        severity: "info",
        dedupeKey: `daily_brief_${now.toDateString()}`
    });
    if (created) {
        await generateDashboardBrief("daily_start");
        return "Generated daily brief";
    }
  }
  return "No action needed";
}

async function executeEndOfDayBriefTime() {
  const now = new Date();
  if (now.getHours() === 19) { // 7 PM
    const created = await createNotificationIfNotExists({
        title: "End-of-Day Brief Ready",
        message: "Your End-of-Day Brief has been generated.",
        type: "brief_ready",
        severity: "info",
        dedupeKey: `eod_brief_${now.toDateString()}`
    });
    if (created) {
        await generateDashboardBrief("daily_end");
        return "Generated EOD brief";
    }
  }
  return "No action needed";
}

async function executeStockBrief(type: "stock_start" | "stock_end") {
  // Use America/New_York
  const nyTimeStr = new Date().toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyTime = new Date(nyTimeStr);
  
  let shouldRun = false;
  let key = "";
  
  if (type === "stock_start" && nyTime.getHours() === 9 && nyTime.getMinutes() >= 0 && nyTime.getMinutes() < 30) {
      shouldRun = true;
      key = `stock_start_${nyTime.toDateString()}`;
  } else if (type === "stock_end" && nyTime.getHours() === 16 && nyTime.getMinutes() >= 15 && nyTime.getMinutes() < 45) {
      shouldRun = true;
      key = `stock_end_${nyTime.toDateString()}`;
  }

  if (shouldRun) {
     const created = await createNotificationIfNotExists({
        title: `Stock ${type === 'stock_start' ? 'Open' : 'Close'} Brief Ready`,
        message: `Your Stock Brief has been generated. Informational only. Not financial advice.`,
        type: "brief_ready",
        severity: "info",
        dedupeKey: key
    });
    if (created) {
        await generateDashboardBrief(type);
        return `Generated ${type} brief`;
    }
  }

  return "No action needed";
}
