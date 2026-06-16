import Link from "next/link";
import { Bell, ArrowLeft, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { isFollowUpDue } from "@/lib/schedulingSecretary/followUps";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const rules = await prisma.schedulingFollowUpRule.findMany({
    where: { status: { in: ["pending", "drafted"] } },
    orderBy: { dueAt: "asc" },
    include: { conversation: true },
  });

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <Link href="/assistant/scheduling" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Scheduling assistant</Link>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Bell className="text-blue-400" /> Scheduling follow-ups
        </h1>
        <p className="text-zinc-400">
          Waiting on a reply? These are your local follow-up reminders. When one is due, open the
          conversation to generate a follow-up draft — <strong className="text-white">nothing is sent automatically</strong>.
        </p>
      </div>

      {rules.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-zinc-400">No pending follow-ups. Use &quot;Track follow-up&quot; on a conversation to add one.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => {
            const due = isFollowUpDue(r.dueAt.getTime());
            return (
              <li key={r.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
                <div>
                  <Link href={`/assistant/scheduling/${r.conversationId}`} className="font-medium text-white text-sm hover:underline">{r.conversation.title}</Link>
                  <div className="text-xs text-zinc-400">Due {r.dueAt.toLocaleString()} · every {r.intervalHours}h</div>
                </div>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-full ${due ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-zinc-400"}`}>{due ? "Due now" : "Waiting"}</span>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-[11px] text-zinc-500 mt-6 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Follow-ups are local reminders only. No automatic emails.
      </p>
    </div>
  );
}
