"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function getUnreadNotifications() {
  try {
    return await prisma.notification.findMany({
      where: { status: "unread" },
      orderBy: { createdAt: 'desc' }
    });
  } catch (error) {
    return [];
  }
}

export async function markNotificationRead(id: string) {
  try {
    await prisma.notification.update({
      where: { id },
      data: { status: "read" }
    });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
