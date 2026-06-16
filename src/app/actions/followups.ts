"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function updateFollowUpStatus(id: string, status: string) {
  try {
    await prisma.followUp.update({
      where: { id },
      data: { status }
    });
    
    await logAudit("followup_updated", "FollowUp", id, { status });
    revalidatePath("/followups");
    
    return { success: true };
  } catch { return { success: false }; }
}

export async function createFollowUp(data: { title: string; reason?: string; priority?: string; source?: string; relatedContactId?: string }) {
  try {
    const fw = await prisma.followUp.create({
      data: {
        title: data.title,
        reason: data.reason || "",
        status: "pending",
        priority: data.priority || "normal",
        source: data.source || "manual",
        relatedContactId: data.relatedContactId
      }
    });

    await logAudit("followup_created", "FollowUp", fw.id, { title: data.title });
    revalidatePath("/followups");
    
    return { success: true, id: fw.id };
  } catch { return { success: false }; }
}
