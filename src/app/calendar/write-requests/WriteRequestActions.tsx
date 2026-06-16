"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Play, Loader2 } from "lucide-react";
import {
  approveCalendarWriteRequest, rejectCalendarWriteRequest, executeCalendarWriteRequest,
} from "@/app/actions/scheduling";

export function WriteRequestActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: (id: string) => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await fn(id);
      if (!res.success && res.error) alert(res.error);
      router.refresh();
    });
  }

  if (status === "rejected") return <span className="text-xs text-red-400">Rejected</span>;
  if (status === "executed") return <span className="text-xs text-green-400">Executed (local hold)</span>;
  if (status === "provider_unavailable") return <span className="text-xs text-amber-400">Provider unavailable — local hold created</span>;

  return (
    <div className="flex items-center gap-2">
      {status === "pending_approval" && (
        <>
          <button onClick={() => run(approveCalendarWriteRequest)} disabled={pending} className="px-2.5 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs flex items-center gap-1 disabled:opacity-50">
            {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Approve
          </button>
          <button onClick={() => run(rejectCalendarWriteRequest)} disabled={pending} className="px-2.5 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs flex items-center gap-1 disabled:opacity-50">
            <XCircle className="w-3 h-3" /> Reject
          </button>
        </>
      )}
      {status === "approved" && (
        <button onClick={() => run(executeCalendarWriteRequest)} disabled={pending} className="px-2.5 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-xs flex items-center gap-1 disabled:opacity-50">
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />} Execute (local hold)
        </button>
      )}
    </div>
  );
}
