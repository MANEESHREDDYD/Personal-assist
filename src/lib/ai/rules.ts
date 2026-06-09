import { AIProvider } from "./provider";

export class RulesProvider implements AIProvider {
  name = "rules";

  async classifyText(text: string) {
    const lower = text.toLowerCase();
    
    if (lower.includes("invoice") || lower.includes("payment due") || lower.includes("amount due")) {
      return { category: "Payment", confidence: 0.85, nextAction: "Schedule Payment" };
    }
    if (lower.includes("flight") || lower.includes("itinerary") || lower.includes("hotel reservation")) {
      return { category: "Travel", confidence: 0.90, nextAction: "Add to Calendar" };
    }
    if (lower.includes("ticket") || lower.includes("admission") || lower.includes("eventbrite")) {
      return { category: "Ticket", confidence: 0.88, nextAction: "Save Ticket" };
    }
    if (lower.includes("shipped") || lower.includes("out for delivery") || lower.includes("tracking number")) {
      return { category: "Order", confidence: 0.92, nextAction: "Track Order" };
    }
    if (lower.includes("sign") || lower.includes("signature required") || lower.includes("docusign")) {
      return { category: "Document", confidence: 0.85, nextAction: "Review & Sign" };
    }
    
    return { category: "General", confidence: 0.60, nextAction: "Read message" };
  }

  async extractEntities(text: string) {
    const entities: Record<string, any> = {};
    
    // Extract dates
    const dateMatch = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]* \d{1,2}(st|nd|rd|th)?,? \d{4}\b/i);
    if (dateMatch) entities.date = dateMatch[0];
    
    // Extract amounts
    const amountMatch = text.match(/\$[0-9,]+(\.\d{2})?/);
    if (amountMatch) entities.amount = amountMatch[0];
    
    // Extract tracking numbers
    const trackingMatch = text.match(/\b(1Z[0-9A-Z]{16}|[\dT]\d{10}\d?|\d{15}|\d{20,22})\b/);
    if (trackingMatch) entities.trackingNumber = trackingMatch[0];
    
    return entities;
  }

  async summarizeDocument(text: string) {
    const wordCount = text.split(/\s+/).length;
    const lower = text.toLowerCase();
    const type = lower.includes("invoice") ? "Invoice" : 
                 lower.includes("agreement") || lower.includes("contract") ? "Contract" : 
                 "Document";
    
    const entities = await this.extractEntities(text);
    
    let summary = `Rule-based Summary:\n- File Type: ${type}\n- Word Count: ~${wordCount}`;
    if (entities.amount) summary += `\n- Detected Amount: ${entities.amount}`;
    if (entities.date) summary += `\n- Detected Date: ${entities.date}`;
    
    return summary;
  }

  async detectFollowUps(text: string) {
    const lower = text.toLowerCase();
    const keywords = ["waiting for", "follow up", "due by", "get back to you", "respond by", "checking in", "sign by"];
    
    const detected = keywords.some(k => lower.includes(k));
    if (detected) {
      return { detected: true, reason: "Detected follow-up phrasing." };
    }
    return { detected: false };
  }

  async generateBrief(type: string, context: any) {
    if (type === "stock_start") {
      return `Informational Only. Not financial advice. Today's watchlist has ${context?.stocks?.length || 0} active tickers. Make sure to check any earnings today.`;
    }
    if (type === "stock_end") {
      return `Informational Only. Not financial advice. The market has closed. Watchlist summary complete.`;
    }
    if (type === "daily_start") {
      return `Rule-Based Daily Brief:\n- Pending Approvals: ${context?.pendingApprovals || 0}\n- Documents Needing Review: ${context?.documentsReview || 0}\n- Today's Meetings: ${context?.meetings || 0}`;
    }
    return `End-of-Day Brief:\n- Completed Items: ${context?.completedItems || 0}\n- Pending Approvals: ${context?.pendingApprovals || 0}`;
  }

  async editDocument(text: string, instructions: string) {
    return `[RULES EDITED VERSION]\nInstructions applied: ${instructions}\n\nOriginal excerpt:\n${text.substring(0, 150)}...`;
  }
}
