"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { runOptimization, approveProposal, rejectProposal } from "@/app/actions/planner";

export function RunButton({ scope }: { scope: "day" | "week" }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function run() {
    startTransition(async () => {
      const r = await runOptimization(scope);
      if (r.success && r.id) router.push(`/optimizer/${r.id}`);
      else if (r.error) alert(r.error);
      else router.refresh();
    });
  }
  return (
    <button onClick={run} disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Run {scope} optimization
    </button>
  );
}

export function ProposalActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (status === "approved") return <span className="text-xs text-green-400">Approved → calendar write request created</span>;
  if (status === "rejected") return <span className="text-xs text-red-400">Rejected</span>;
  function act(fn: (id: string) => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => { const r = await fn(id); if (!r.success && r.error) alert(r.error); router.refresh(); });
  }
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => act(approveProposal)} disabled={pending} className="px-2.5 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs flex items-center gap-1 disabled:opacity-50">
        {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
      </button>
      <button onClick={() => act(rejectProposal)} disabled={pending} className="px-2.5 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs flex items-center gap-1 disabled:opacity-50">
        <XCircle className="w-3 h-3" /> Reject
      </button>
    </div>
  );
}
