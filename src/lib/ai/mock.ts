/* eslint-disable @typescript-eslint/no-unused-vars */
import { AIProvider } from "./provider";

export class MockAIProvider implements AIProvider {
  name = "mock";

  async classifyText(_text: string) {
    return {
      category: "General",
      confidence: 0.95,
      nextAction: "Review message",
    };
  }

  async extractEntities(_text: string) {
    return {
      mockEntity: "Detected by MockProvider",
    };
  }

  async summarizeDocument(_text: string) {
    return "This is a deterministic mock summary from the Mock AI Provider.";
  }

  async detectFollowUps(_text: string) {
    return {
      detected: false,
    };
  }

  async generateBrief(type: string, _context: unknown) {
    if (type.includes("stock")) {
      return "Mock Stock Brief: Informational only. Market looks volatile.";
    }
    return "Mock Brief: You have 3 pending items. Have a great day!";
  }

  async editDocument(text: string, instructions: string) {
    return `[MOCK EDITED VERSION]\nInstructions applied: ${instructions}\n\nOriginal excerpt:\n${text.substring(0, 150)}...`;
  }

  async extractActionItems(_text: string): Promise<string[]> {
    return ["Mock Action 1: Review document", "Mock Action 2: Approve the draft"];
  }

  async extractDeadlines(_text: string): Promise<{ date: string; description: string }[]> {
    return [{ date: "Next Friday", description: "Deadline for mock document review" }];
  }

  async extractParties(_text: string): Promise<{ name: string; role: string }[]> {
    return [
      { name: "John Doe", role: "Sender" },
      { name: "Jane Smith", role: "Recipient" }
    ];
  }

  async extractPaymentTerms(_text: string): Promise<string> {
    return "Net 30 days. Mock payment terms detected.";
  }

  async extractSignatureRequirements(_text: string): Promise<string> {
    return "Signature required by John Doe at the bottom of page 2.";
  }

  async identifyRisks(_text: string): Promise<string[]> {
    return ["Mock Risk: The timeline is extremely aggressive.", "Mock Risk: Penalty clause found."];
  }

  async generateDraftFromDocument(_text: string, draftType: string): Promise<{ subject: string; body: string }> {
    let subject = "Document Draft";
    let body = `This is a mock local draft for type: ${draftType}.`;

    if (draftType === "signature_request") {
      subject = "Signature Required";
      body = "Please review and sign the attached mock document.\n\nThank you.";
    }

    return { subject, body };
  }
}
