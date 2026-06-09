import { prisma } from "@/lib/prisma";
import { Inbox } from "lucide-react";
import { InboxForm } from "./InboxForm";
import { InboxItemCard } from "./InboxItemCard";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const items = await prisma.inboxItem.findMany({
    orderBy: { createdAt: "desc" },
  });

  const documents = await prisma.document.findMany();
  const drafts = await prisma.emailDraft.findMany();

  return (
    <div className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Inbox className="text-blue-400" />
            Unified Inbox
          </h1>
          <p className="text-zinc-400">Mock simulation of incoming emails before live API integration.</p>
        </div>

        <InboxForm />
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-6">Recent Inbox Items</h2>
        
        {items.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-zinc-400">
            No items in your inbox.
          </div>
        ) : (
          <div className="space-y-4">
              {items.map((item) => {
                const itemDocs = documents.filter(d => d.notes && d.notes.includes(`"inboxItemId":"${item.id}"`));
                const itemDrafts = drafts.filter(d => {
                  if (!d.metadata) return false;
                  try {
                    const m = JSON.parse(d.metadata);
                    return m.sourceInboxItemId === item.id;
                  } catch {
                    return false;
                  }
                });
                return (
                  <InboxItemCard key={item.id} item={item} relatedDocs={itemDocs} relatedDrafts={itemDrafts} />
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
