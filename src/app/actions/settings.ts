"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function updateAIPref(key: string, value: string) {
  try {
    await prisma.userPreference.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    if (key === "AI_PROVIDER") {
      await logAudit("ai_provider_changed", "UserPreference", key, { newProvider: value });
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Failed to update AI pref", error);
    return { success: false };
  }
}

export async function getAIPrefs() {
  const prefs = await prisma.userPreference.findMany({
    where: { key: { in: ["AI_PROVIDER", "OLLAMA_BASE_URL", "OLLAMA_MODEL"] } }
  });
  
  return {
    provider: prefs.find(p => p.key === "AI_PROVIDER")?.value || process.env.AI_PROVIDER || "rules",
    ollamaUrl: prefs.find(p => p.key === "OLLAMA_BASE_URL")?.value || process.env.OLLAMA_BASE_URL || "http://localhost:11434",
    ollamaModel: prefs.find(p => p.key === "OLLAMA_MODEL")?.value || process.env.OLLAMA_MODEL || "llama3.1",
  };
}
