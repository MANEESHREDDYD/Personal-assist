"use server";

import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function globalSearch(query: string) {
  if (!query || query.length < 2) return { cards: [], docs: [], inbox: [], contacts: [] };

  const q = `%${query}%`;

  const [cards, docs, inbox, contacts] = await Promise.all([
    prisma.walletCard.findMany({
      where: {
        OR: [
          { title: { contains: query } },
          { category: { contains: query } },
          { location: { contains: query } },
          { nextAction: { contains: query } }
        ]
      },
      take: 10
    }),
    prisma.document.findMany({
      where: {
        OR: [
          { filename: { contains: query } },
          { aiSummary: { contains: query } },
          { notes: { contains: query } }
        ]
      },
      take: 10
    }),
    prisma.inboxItem.findMany({
      where: {
        OR: [
          { subject: { contains: query } },
          { body: { contains: query } },
          { sender: { contains: query } }
        ]
      },
      take: 10
    }),
    prisma.contact.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { company: { contains: query } }
        ]
      },
      take: 10
    })
  ]);

  await logAudit("global_search_performed", "System", "manual", { query });

  return { cards, docs, inbox, contacts };
}
