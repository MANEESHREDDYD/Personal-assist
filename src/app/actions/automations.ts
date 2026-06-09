"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

// We import this directly so we can run automations manually from the UI
import { runAutomations } from "@/lib/automation/engine";

export async function enableRule(id: string) {
  try {
    await prisma.automationRule.update({ where: { id }, data: { enabled: true } });
    await logAudit("automation_rule_enabled", "AutomationRule", id, {});
    revalidatePath("/automations");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function disableRule(id: string) {
  try {
    await prisma.automationRule.update({ where: { id }, data: { enabled: false } });
    await logAudit("automation_rule_disabled", "AutomationRule", id, {});
    revalidatePath("/automations");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function runNow() {
  try {
    await logAudit("automation_run_started", "System", "manual", { source: "ui" });
    await runAutomations();
    revalidatePath("/automations");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function resetDefaultRules() {
  try {
    const defaults = [
      { name: "Daily Life Brief", description: "Generate brief at 8:00 AM", triggerType: "daily_brief_time" },
      { name: "End-of-Day Brief", description: "Generate brief at 7:00 PM", triggerType: "end_of_day_brief_time" },
      { name: "Stock Open Brief", description: "Generate brief at 9:00 AM NY time", triggerType: "stock_open_brief_time" },
      { name: "Stock Close Brief", description: "Generate brief at 4:15 PM NY time", triggerType: "stock_close_brief_time" },
      { name: "Reminder Due Notification", description: "Notify when reminder is due", triggerType: "reminder_due" },
      { name: "Payment Due Soon", description: "Notify 3 days before payment", triggerType: "payment_due_soon" },
      { name: "Signer Follow-Up", description: "Follow up if signer has not signed after 3 days", triggerType: "signer_not_signed" },
      { name: "Approval Pending", description: "Notify if approval pending > 24h", triggerType: "approval_pending_too_long" },
      { name: "Travel Upcoming", description: "Notify 24h before travel", triggerType: "travel_upcoming" },
      { name: "Calendar Event Upcoming", description: "Notify 30 mins before event", triggerType: "calendar_event_upcoming" },
      { name: "Follow-Up Due", description: "Notify when follow up is due", triggerType: "followup_due" },
      { name: "Weekly Backup", description: "Reminder for local backup", triggerType: "weekly_backup_reminder" }
    ];

    for (const rule of defaults) {
      const existing = await prisma.automationRule.findFirst({ where: { triggerType: rule.triggerType } });
      if (!existing) {
        await prisma.automationRule.create({ data: rule });
      }
    }

    await logAudit("automation_rules_reset", "System", "default_rules", {});
    revalidatePath("/automations");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
