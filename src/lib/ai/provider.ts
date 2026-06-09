import { prisma } from "@/lib/prisma";

export interface AIProvider {
  name: string;
  classifyText(text: string): Promise<{ category: string; confidence: number; nextAction?: string }>;
  extractEntities(text: string): Promise<Record<string, any>>;
  summarizeDocument(text: string): Promise<string>;
  detectFollowUps(text: string): Promise<{ detected: boolean; reason?: string; dueDate?: Date }>;
  generateBrief(type: string, context: any): Promise<string>;
  editDocument(text: string, instructions: string): Promise<string>;
  extractActionItems(text: string): Promise<string[]>;
  extractDeadlines(text: string): Promise<{ date: string; description: string }[]>;
  extractParties(text: string): Promise<{ name: string; role: string }[]>;
  extractPaymentTerms(text: string): Promise<string>;
  extractSignatureRequirements(text: string): Promise<string>;
  identifyRisks(text: string): Promise<string[]>;
  generateDraftFromDocument(text: string, draftType: string): Promise<{ subject: string; body: string }>;
}

export async function getAIProvider(): Promise<AIProvider> {
  let providerName = process.env.AI_PROVIDER || "rules";

  try {
    const pref = await prisma.userPreference.findUnique({
      where: { key: "AI_PROVIDER" }
    });
    if (pref) {
      providerName = pref.value;
    }
  } catch (e) {
    // Database might not be ready during build or tests
  }

  if (providerName === "mock") {
    const { MockAIProvider } = await import("./mock");
    return new MockAIProvider();
  }

  if (providerName === "ollama") {
    const { OllamaProvider } = await import("./ollama");
    const ollama = new OllamaProvider();
    const isAvailable = await ollama.checkAvailability();
    if (isAvailable) {
      return ollama;
    }
    console.warn("Ollama is not available. Falling back to rules provider.");
  }

  // Default fallback
  const { RulesProvider } = await import("./rules");
  return new RulesProvider();
}
