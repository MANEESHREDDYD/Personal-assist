"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { generateDashboardBrief } from "./dashboard";

export async function checkOnboardingStatus() {
  const pref = await prisma.userPreference.findUnique({
    where: { key: "onboardingCompleted" }
  });
  return pref?.value === "true";
}

export async function completeOnboarding(
  mode: "empty" | "demo",
  aiProvider: string
) {
  try {
    // Save AI provider
    await prisma.userPreference.upsert({
      where: { key: "AI_PROVIDER" },
      update: { value: aiProvider },
      create: { key: "AI_PROVIDER", value: aiProvider }
    });

    // Handle data generation
    if (mode === "empty") {
      // Create one starter item
      const starterCard = await prisma.walletCard.create({
         data: {
            type: "task",
            title: "Explore Personal Assist",
            category: "Getting Started",
            status: "Pending",
            source: "System",
            metadata: JSON.stringify({ note: "Welcome to your local workspace!" })
         }
      });
      await logAudit("card_created", "WalletCard", starterCard.id, { message: "Starter item created" });

      // Generate a starter brief
      await generateDashboardBrief("daily_start");
    } else {
      // If Demo, we'll let the demo seed handle it, or we could call a full reset/seed here.
      // But according to the plan, we might just call the existing seed logic.
      // Let's rely on the user running npm run db:reset for now, or just seed the starter items.
      // Actually, if they chose Demo Mode here, I should generate a small demo scenario so it's not totally empty.
      
      const starterCard = await prisma.walletCard.create({
         data: {
            type: "document",
            title: "Welcome_Guide.pdf",
            category: "Getting Started",
            status: "Needs Review",
            source: "System",
         }
      });
      await generateDashboardBrief("daily_start");
    }

    // Mark completed
    await prisma.userPreference.upsert({
      where: { key: "onboardingCompleted" },
      update: { value: "true" },
      create: { key: "onboardingCompleted", value: "true" }
    });

    await logAudit("onboarding_completed", "System", "manual", { mode, aiProvider });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Onboarding error:", error);
    return { success: false, error: error.message };
  }
}

export async function resetOnboarding() {
  try {
    await prisma.userPreference.delete({
      where: { key: "onboardingCompleted" }
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
