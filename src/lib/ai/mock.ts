import { AIProvider } from "./provider";

export class MockAIProvider implements AIProvider {
  name = "mock";

  async classifyText(text: string) {
    return {
      category: "General",
      confidence: 0.95,
      nextAction: "Review message",
    };
  }

  async extractEntities(text: string) {
    return {
      mockEntity: "Detected by MockProvider",
    };
  }

  async summarizeDocument(text: string) {
    return "This is a deterministic mock summary from the Mock AI Provider.";
  }

  async detectFollowUps(text: string) {
    return {
      detected: false,
    };
  }

  async generateBrief(type: string, context: any) {
    if (type.includes("stock")) {
      return "Mock Stock Brief: Informational only. Market looks volatile.";
    }
    return "Mock Brief: You have 3 pending items. Have a great day!";
  }

  async editDocument(text: string, instructions: string) {
    return `[MOCK EDITED VERSION]\nInstructions applied: ${instructions}\n\nOriginal excerpt:\n${text.substring(0, 150)}...`;
  }
}
