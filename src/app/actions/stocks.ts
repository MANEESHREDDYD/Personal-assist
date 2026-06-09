"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

import { getAIProvider } from "@/lib/ai/provider";

export async function addStock(formData: FormData) {
  try {
    const ticker = formData.get("ticker") as string;
    const reason = formData.get("reason") as string;
    const notes = formData.get("notes") as string;

    const card = await prisma.walletCard.create({
      data: {
        type: "stock",
        title: ticker.toUpperCase(),
        category: "Stock Watchlist",
        status: "Watching",
        metadata: JSON.stringify({ reason, notes }),
      },
    });

    await logAudit("stock_added", "WalletCard", card.id, { ticker });
    revalidatePath("/stocks");
    revalidatePath("/wallet");

    return { success: true };
  } catch (error) {
    console.error("Failed to add stock", error);
    return { success: false };
  }
}

export async function generateStockBrief(type: "stock_start" | "stock_end") {
  try {
    const ai = await getAIProvider();
    const activeStocks = await prisma.walletCard.findMany({ where: { type: "stock" } });
    const tickers = activeStocks.map(s => s.title);
    
    const context = {
      stocks: tickers,
    };

    const content = await ai.generateBrief(type, context);

    const brief = await prisma.brief.create({
      data: {
        type,
        content: JSON.stringify({
          indexSnapshot: "S&P 500: 5,400 (+0.5%) | Nasdaq: 17,200 (+0.8%)",
          content: content,
        }),
      },
    });

    await logAudit("brief_generated", "Brief", brief.id, { type });
    revalidatePath("/stocks");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to generate stock brief", error);
    return { success: false };
  }
}
