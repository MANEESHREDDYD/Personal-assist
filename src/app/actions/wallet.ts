"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function addWalletCard(data: {
  type: string;
  title: string;
  category: string;
  status: string;
  amount?: number;
  date?: Date;
  notes?: string;
}) {
  try {
    const card = await prisma.walletCard.create({
      data: {
        type: data.type,
        title: data.title,
        category: data.category,
        status: data.status,
        amount: data.amount,
        date: data.date,
        metadata: data.notes ? JSON.stringify({ notes: data.notes }) : null,
      },
    });

    await logAudit("card_created", "WalletCard", card.id, { title: card.title });
    revalidatePath("/wallet");
    revalidatePath("/");
    
    return { success: true, card };
  } catch (error) {
    console.error("Failed to add wallet card", error);
    return { success: false, error: "Failed to create card" };
  }
}
