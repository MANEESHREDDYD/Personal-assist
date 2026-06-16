/* eslint-disable @typescript-eslint/no-unused-vars */
import { AIProvider } from "./provider";
import { RulesProvider } from "./rules";
import { prisma } from "@/lib/prisma";

export class OllamaProvider implements AIProvider {
  name = "ollama";
  private rulesFallback = new RulesProvider();

  private async getConfig() {
    let baseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
    let model = process.env.OLLAMA_MODEL || "llama3.1";
    
    try {
      const prefUrl = await prisma.userPreference.findUnique({ where: { key: "OLLAMA_BASE_URL" } });
      const prefModel = await prisma.userPreference.findUnique({ where: { key: "OLLAMA_MODEL" } });
      
      if (prefUrl) baseUrl = prefUrl.value;
      if (prefModel) model = prefModel.value;
    } catch(_e: unknown) {}

    return { baseUrl, model };
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const { baseUrl } = await this.getConfig();
      const res = await fetch(`${baseUrl}/api/tags`, { method: "GET", signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch (_e: unknown) {
      return false;
    }
  }

  private async generate(prompt: string): Promise<string | null> {
    try {
      const { baseUrl, model } = await this.getConfig();
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, prompt, stream: false }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.response;
    } catch (e) {
      console.error("Ollama generation failed:", e);
      return null;
    }
  }

  async classifyText(text: string) {
    const prompt = `Classify this text into one of: Payment, Travel, Ticket, Order, Document, General. Respond ONLY with the category name.\nText: ${text.slice(0, 1000)}`;
    const result = await this.generate(prompt);
    
    if (!result) return this.rulesFallback.classifyText(text);
    
    const category = result.trim().replace(/[^a-zA-Z]/g, '');
    const valid = ["Payment", "Travel", "Ticket", "Order", "Document", "General"].includes(category);
    
    return {
      category: valid ? category : "General",
      confidence: 0.95,
      nextAction: "Review generated item"
    };
  }

  async extractEntities(text: string) {
    // For MVP, if Ollama is too complex to reliably parse JSON, we fall back to rules
    // Or we could do a simpler extraction prompt. Let's use the rules fallback for reliability in entity extraction for now,
    // combined with a small LLM extraction if we want to be fancy.
    return this.rulesFallback.extractEntities(text);
  }

  async summarizeDocument(text: string) {
    const prompt = `Summarize the following document in 3-4 bullet points. Be concise.\n\n${text.slice(0, 2000)}`;
    const result = await this.generate(prompt);
    if (!result) return this.rulesFallback.summarizeDocument(text);
    return `Ollama Summary:\n${result}`;
  }

  async detectFollowUps(text: string) {
    return this.rulesFallback.detectFollowUps(text);
  }

  async generateBrief(type: string, context: unknown) {
    const prompt = `Write a short 3-sentence daily life brief based on this context: ${JSON.stringify(context)}. Tone: Professional and helpful assistant.`;
    const result = await this.generate(prompt);
    if (!result) return this.rulesFallback.generateBrief(type, context);
    
    if (type.includes("stock")) {
      return `Informational Only. Not financial advice.\n${result}`;
    }
    return result;
  }

  async editDocument(text: string, instructions: string) {
    const prompt = `You are a professional document assistant. Perform the following action on the provided document text:\nAction: ${instructions}\n\nDocument Text:\n${text.slice(0, 3000)}\n\nRespond ONLY with the edited text or extracted information.`;
    const result = await this.generate(prompt);
    if (!result) return this.rulesFallback.editDocument(text, instructions);
    return result.trim();
  }

  async extractActionItems(text: string): Promise<string[]> {
    const prompt = `Extract a list of distinct action items or tasks from the following text. Return ONLY a valid JSON array of strings. If no action items, return [].\nText: ${text.slice(0, 2000)}`;
    const result = await this.generate(prompt);
    if (!result) return this.rulesFallback.extractActionItems(text);
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : this.rulesFallback.extractActionItems(text);
    } catch {
      return this.rulesFallback.extractActionItems(text);
    }
  }

  async extractDeadlines(text: string): Promise<{ date: string; description: string }[]> {
    const prompt = `Extract deadlines from the following text. Return ONLY a valid JSON array of objects with keys "date" and "description". If none, return [].\nText: ${text.slice(0, 2000)}`;
    const result = await this.generate(prompt);
    if (!result) return this.rulesFallback.extractDeadlines(text);
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : this.rulesFallback.extractDeadlines(text);
    } catch {
      return this.rulesFallback.extractDeadlines(text);
    }
  }

  async extractParties(text: string): Promise<{ name: string; role: string }[]> {
    const prompt = `Extract people or companies from the following text and their roles. Return ONLY a valid JSON array of objects with keys "name" and "role". If none, return [].\nText: ${text.slice(0, 2000)}`;
    const result = await this.generate(prompt);
    if (!result) return this.rulesFallback.extractParties(text);
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : this.rulesFallback.extractParties(text);
    } catch {
      return this.rulesFallback.extractParties(text);
    }
  }

  async extractPaymentTerms(text: string): Promise<string> {
    const prompt = `Extract payment terms, amounts due, or pricing from the following text. Return a concise string summary. If none, return "No explicit payment terms detected."\nText: ${text.slice(0, 2000)}`;
    const result = await this.generate(prompt);
    if (!result) return this.rulesFallback.extractPaymentTerms(text);
    return result.trim();
  }

  async extractSignatureRequirements(text: string): Promise<string> {
    const prompt = `Extract signature requirements from the following text (e.g. who needs to sign, dates, format). Return a concise string summary. If none, return "No explicit signature requirements detected."\nText: ${text.slice(0, 2000)}`;
    const result = await this.generate(prompt);
    if (!result) return this.rulesFallback.extractSignatureRequirements(text);
    return result.trim();
  }

  async identifyRisks(text: string): Promise<string[]> {
    const prompt = `Identify risks, penalty clauses, harsh terms, or missing information in the following text. Return ONLY a valid JSON array of strings. If none, return ["No obvious high-risk terms detected."].\nText: ${text.slice(0, 2000)}`;
    const result = await this.generate(prompt);
    if (!result) return this.rulesFallback.identifyRisks(text);
    try {
      const parsed = JSON.parse(result);
      return Array.isArray(parsed) ? parsed : this.rulesFallback.identifyRisks(text);
    } catch {
      return this.rulesFallback.identifyRisks(text);
    }
  }

  async generateDraftFromDocument(text: string, draftType: string): Promise<{ subject: string; body: string }> {
    const prompt = `Write a professional email draft based on this document. The draft type is "${draftType}". Do not include placeholder brackets, write a realistic draft. Return ONLY a valid JSON object with "subject" and "body" keys.\nDocument text: ${text.slice(0, 2000)}`;
    const result = await this.generate(prompt);
    if (!result) return this.rulesFallback.generateDraftFromDocument(text, draftType);
    try {
      const parsed = JSON.parse(result);
      if (parsed.subject && parsed.body) return parsed;
      return this.rulesFallback.generateDraftFromDocument(text, draftType);
    } catch {
      return this.rulesFallback.generateDraftFromDocument(text, draftType);
    }
  }
}
