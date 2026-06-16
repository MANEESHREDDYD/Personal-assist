import Link from "next/link";
import { Wand2, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RunButton } from "./OptimizerClient";

export const dynamic = "force-dynamic";

export default async function OptimizerPage() {
  const runs = await prisma.optimizationRun.findMany({ orderBy: { createdAt: "desc" }, take: 15, include: { _count: { select: { proposals: true } } } });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><Wand2 className="text-blue-400" /> Optimizer</h1>
        <p className="text-zinc-400">
          Schedules tasks, focus blocks, and habits into open time, and proposes moves for
          overloaded days. Every proposal is reviewed; approving creates an approval-gated
          calendar write request — <strong className="text-white">nothing is written externally</strong>.
        </p>
        <div className="flex gap-2 mt-3"><RunButton scope="day" /><RunButton scope="week" /></div>
      </div>

      {runs.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center"><p className="text-zinc-400">No optimization runs yet. Add tasks/habits, set your focus policy, then run an optimization.</p></div>
      ) : (
        <ul className="space-y-2">
          {runs.map((r) => (
            <li key={r.id}>
              <Link href={`/optimizer/${r.id}`} className="glass-card rounded-xl p-3 flex items-center justify-between hover:border-white/30 border border-white/10 transition-all">
                <div><div className="font-medium text-white text-sm">{r.scope} optimization</div><div className="text-xs text-zinc-400">{r.createdAt.toLocaleString()} · {r._count.proposals} proposal(s)</div></div>
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-zinc-300">{r.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-zinc-500 mt-6 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> No provider calendar writes, no meeting moves without approval, no emails sent.</p>
    </div>
  );
}
