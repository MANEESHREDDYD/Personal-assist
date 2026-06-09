import { prisma } from "@/lib/prisma";
import { ReminderClient } from "./ReminderClient";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const reminders = await prisma.reminder.findMany({
    orderBy: { dueDate: 'asc' }
  });

  return <ReminderClient reminders={reminders} />;
}
