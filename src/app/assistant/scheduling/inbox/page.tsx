import Link from "next/link";
import { Inbox, ShieldCheck, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ScheduleFromInbox } from "./ScheduleFromInbox";

export const dynamic = "force-dynamic";

/** Derives a scheduling command from an inbox item without mutating provider state. */
function deriveCommand(subject: string, sender: string): string {
  const who = (sender.split("<")[0] || sender).trim() || "the sender";
  return `schedule 30 minutes with ${who} this week about ${subject}`.slice(0, 200);
}

export default async function SchedulingInboxPage() {
  const items = await prisma.inboxItem.findMany({ orderBy: { createdAt: "desc" }, take: 25 });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <Link href="/assistant/scheduling" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Scheduling assistant</Link>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Inbox className="text-blue-400" /> Schedule from inbox
        </h1>
        <p className="text-zinc-400">
          Turn an email into a scheduling conversation. We read the local inbox item to seed a
          request — <strong className="text-white">we never modify the provider mailbox</strong> and
          never send anything.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-zinc-400">No inbox items yet. Seed demo data or sync a read-only mail connector first.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={it.id} className="glass-card rounded-xl p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium text-white text-sm truncate">{it.subject}</div>
                <div className="text-xs text-zinc-500 truncate">From: {it.sender}</div>
              </div>
              <ScheduleFromInbox itemId={it.id} command={deriveCommand(it.subject, it.sender)} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-zinc-500 mt-6 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Read-only: no provider mailbox changes, no sending, no silent calendar writes.
      </p>
    </div>
  );
}
