import Link from "next/link";
import { Bot, ShieldCheck, Inbox, Bell } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/schedulingSecretary/conversations";
import type { ConversationStatus } from "@/lib/schedulingSecretary/types";
import { CommandInput } from "./CommandInput";

export const dynamic = "force-dynamic";

export default async function SchedulingAssistantPage() {
  const [conversations, pendingFollowUps] = await Promise.all([
    prisma.schedulingConversation.findMany({ orderBy: { updatedAt: "desc" }, take: 20, include: { _count: { select: { candidateSlots: true, replyDrafts: true } } } }),
    prisma.schedulingFollowUpRule.count({ where: { status: "pending" } }),
  ]);

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Bot className="text-blue-400" /> AI Scheduling Secretary
        </h1>
        <p className="text-zinc-400">
          Describe what you want in plain language. The secretary parses intent, finds candidate
          times from your availability, and drafts replies — <strong className="text-white">all local</strong>.
          Nothing is sent and no calendar event is written without your approval.
        </p>
        <div className="flex gap-2 mt-3">
          <Link href="/assistant/scheduling/inbox" className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-zinc-200 flex items-center gap-1"><Inbox className="w-3 h-3" /> Schedule from inbox</Link>
          <Link href="/assistant/scheduling/follow-ups" className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-zinc-200 flex items-center gap-1"><Bell className="w-3 h-3" /> Follow-ups {pendingFollowUps > 0 && <span className="text-amber-400">({pendingFollowUps})</span>}</Link>
        </div>
      </div>

      <CommandInput />

      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-3">Recent scheduling conversations</h2>
        {conversations.length === 0 ? (
          <p className="text-sm text-zinc-500">No conversations yet. Enter a request above to start.</p>
        ) : (
          <ul className="space-y-2">
            {conversations.map((c) => (
              <li key={c.id}>
                <Link href={`/assistant/scheduling/${c.id}`} className="glass-card rounded-xl p-3 flex items-center justify-between hover:border-white/30 border border-white/10 transition-all">
                  <div>
                    <div className="font-medium text-white text-sm">{c.title}</div>
                    <div className="text-xs text-zinc-400">{c.intent.replace(/_/g, " ")} · {c._count.candidateSlots} slot(s) · {c._count.replyDrafts} draft(s)</div>
                  </div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-zinc-300">{statusLabel(c.status as ConversationStatus)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 mt-6 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> No emails sent, no provider calendar writes, no attendee notifications. Replies are local drafts; calendar changes are approval-gated.
      </p>
    </div>
  );
}
