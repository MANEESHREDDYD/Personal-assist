import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProposalActions } from "../OptimizerClient";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  schedule_task: "Task", focus_block: "Focus block", schedule_habit: "Habit", break_block: "Break", move_flexible_meeting: "Move flexible meeting",
};

export default async function OptimizationRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await prisma.optimizationRun.findUnique({ where: { id }, include: { proposals: { orderBy: { score: "desc" } } } });
  if (!run) notFound();
  const summary = run.summaryJson ? JSON.parse(run.summaryJson) : null;
  const fmt = (d: Date) => d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <Link href="/optimizer" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> All runs</Link>
      <h1 className="text-2xl font-bold text-white mb-1">{run.scope} optimization</h1>
      <p className="text-sm text-zinc-400 mb-4">{run.createdAt.toLocaleString()} · {run.proposals.length} proposal(s)</p>

      {summary && (
        <div className="grid sm:grid-cols-3 gap-2 mb-6 text-sm">
          <Stat label="Meeting load" value={`${summary.meetingHours ?? 0} h`} />
          <Stat label="Planned focus" value={`${summary.plannedFocusHours ?? 0} h`} />
          <Stat label="Tasks scheduled" value={`${summary.tasksScheduled ?? 0}`} />
          <Stat label="Tasks unscheduled" value={`${summary.tasksUnscheduled ?? 0}`} />
          <Stat label="Fragmented days" value={`${summary.fragmentedDays ?? 0}`} />
          <Stat label="Burnout risk" value={`${Math.round((summary.burnoutRisk ?? 0) * 100)}%`} />
        </div>
      )}

      {run.proposals.length === 0 ? (
        <p className="text-sm text-zinc-500">No proposals — your schedule may be full or there is nothing to schedule.</p>
      ) : (
        <ul className="space-y-2">
          {run.proposals.map((p) => (
            <li key={p.id} className="glass-card rounded-xl p-4 flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="font-medium text-white text-sm">{KIND_LABEL[p.kind] || p.kind}: {p.title}</div>
                <div className="text-xs text-zinc-400">{fmt(p.start)} → {p.end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</div>
                {p.rationale && <div className="text-[11px] text-zinc-500 mt-0.5">{p.rationale}</div>}
              </div>
              <ProposalActions id={p.id} status={p.status} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-zinc-500 mt-6 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Approving creates an approval-gated calendar write request (local hold on execute). No provider write, no meeting move without approval, no email.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="glass-card rounded-xl p-3 text-center"><p className="text-[11px] text-zinc-500">{label}</p><p className="text-xl font-bold text-white">{value}</p></div>;
}
