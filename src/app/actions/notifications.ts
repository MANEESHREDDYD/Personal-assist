"use server";

import { prisma } from "@/lib/prisma";

import { revalidatePath } from "next/cache";

export async function getUnreadNotifications() {
  try {
    return await prisma.notification.findMany({
      where: { status: "unread" },
      orderBy: { createdAt: 'desc' }
    });
  } catch {
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
  } catch { return { success: false }; }
}
