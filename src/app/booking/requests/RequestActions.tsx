"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { approveBookingRequest, rejectBookingRequest } from "@/app/actions/booking";

export function RequestActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (status === "approved") return <span className="text-xs text-green-400">Approved → calendar write request created</span>;
  if (status === "rejected") return <span className="text-xs text-red-400">Rejected</span>;
  if (status === "cancelled") return <span className="text-xs text-zinc-500">Cancelled</span>;

  function run(fn: (id: string) => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => { const r = await fn(id); if (!r.success && r.error) alert(r.error); router.refresh(); });
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => run(approveBookingRequest)} disabled={pending} className="px-2.5 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs flex items-center gap-1 disabled:opacity-50">
        {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
      </button>
      <button onClick={() => run(rejectBookingRequest)} disabled={pending} className="px-2.5 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs flex items-center gap-1 disabled:opacity-50">
        <XCircle className="w-3 h-3" /> Reject
      </button>
    </div>
  );
}
