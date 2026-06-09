import { prisma } from "./prisma";

export interface AIProvider {
  generateDailyBrief: () => Promise<string>;
  generateEndOfDayBrief: () => Promise<string>;
}

export class MockAIProvider implements AIProvider {
  async generateDailyBrief() {
    // Fetch data to construct brief
    const paymentsDue = await prisma.walletCard.count({ where: { type: "payment", status: "Pending" } });
    const docsReview = await prisma.document.count({ where: { status: "needs_review" } });
    
    return JSON.stringify({
      meetingsToday: "10:00 AM - Design Sync | 2:00 PM - Strategy Review",
      paymentsDue: `${paymentsDue} payments pending`,
      documentsNeedingReview: `${docsReview} documents waiting`,
      signaturesPending: "0 pending signatures",
      orders: "Amazon package arriving by 8 PM",
      travel: "No upcoming travel this week.",
      tickets: "None",
      reminders: "Call mom at 6 PM.",
      followUps: "Follow up with John regarding the Q3 report.",
      stockMarketStartBrief: "S&P 500 futures up 0.5%. NVDA reporting earnings.",
      topPriorityActions: "1. Review Q3 report. 2. Pay rent."
    });
  }

  async generateEndOfDayBrief() {
    return JSON.stringify({
      completedItems: "Design sync, Strategy review",
      missedItems: "None",
      pendingApprovals: "1 request waiting for approval.",
      unresolvedFollowUps: "John hasn't replied about Q3 report.",
      upcomingPayments: "Rent due in 3 days.",
      tomorrowMeetings: "9:00 AM - Daily Standup",
      reminders: "Prepare slides for Friday.",
      stockMarketCloseBrief: "S&P 500 closed flat. Tech sector slightly down."
    });
  }
}

export const aiProvider = new MockAIProvider();
