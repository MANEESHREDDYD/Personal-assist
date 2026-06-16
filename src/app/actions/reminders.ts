"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function updateReminderStatus(id: string, status: string) {
  try {
    const reminder = await prisma.reminder.findUnique({ where: { id } });
    if (!reminder) throw new Error("Not found");

    if (status === "completed" && reminder.recurrenceRule) {
      // Calculate next trigger
      const nextTrigger = new Date(reminder.nextTriggerAt || reminder.dueDate || new Date());
      if (reminder.recurrenceRule === "daily") {
         nextTrigger.setDate(nextTrigger.getDate() + 1);
      } else if (reminder.recurrenceRule === "weekly") {
         nextTrigger.setDate(nextTrigger.getDate() + 7);
      } else if (reminder.recurrenceRule === "monthly") {
         nextTrigger.setMonth(nextTrigger.getMonth() + 1);
      } else if (reminder.recurrenceRule.startsWith("custom_days:")) {
         const days = parseInt(reminder.recurrenceRule.split(":")[1]);
         nextTrigger.setDate(nextTrigger.getDate() + days);
      }

      if (reminder.recurrenceEndsAt && nextTrigger > reminder.recurrenceEndsAt) {
         // Recurrence ended
         await prisma.reminder.update({
            where: { id },
            data: { status: "completed", lastTriggeredAt: new Date() }
         });
         await logAudit("reminder_completed", "Reminder", id, { message: "Recurrence ended" });
      } else {
         // Advance recurrence, keep status pending
         await prisma.reminder.update({
            where: { id },
            data: { nextTriggerAt: nextTrigger, dueDate: nextTrigger, lastTriggeredAt: new Date(), status: "pending" }
         });
         await logAudit("reminder_recurrence_advanced", "Reminder", id, { nextTrigger });
      }
    } else {
      await prisma.reminder.update({
        where: { id },
        data: { status }
      });
      await logAudit("reminder_updated", "Reminder", id, { status });
    }
    revalidatePath("/reminders");
    return { success: true };
  } catch { return { success: false }; }
}

export async function snoozeReminder(id: string) {
  try {
    // Snooze for 1 day
    const snoozedUntil = new Date(Date.now() + 86400000);
    await prisma.reminder.update({
      where: { id },
      data: { status: "snoozed", snoozedUntil }
    });
    await logAudit("reminder_snoozed", "Reminder", id, { snoozedUntil });
    revalidatePath("/reminders");
    return { success: true };
  } catch { return { success: false }; }
}
