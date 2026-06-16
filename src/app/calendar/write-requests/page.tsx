import Link from "next/link";
import { ClipboardCheck, ShieldCheck, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { WriteRequestActions } from "./WriteRequestActions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending_approval: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  executed: "Executed (local)",
  provider_unavailable: "Provider unavailable",
};

function fmt(d: Date) {
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function WriteRequestsPage() {
  const requests = await prisma.calendarWriteRequest.findMany({
    orderBy: { createdAt: "desc" }, include: { preview: true }, take: 50,
  });

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <ClipboardCheck className="text-blue-400" /> Calendar Write Requests
        </h1>
        <p className="text-zinc-400">
          Every proposed calendar write is previewed and approval-gated. Execution creates a
          <strong className="text-white"> local hold only</strong> — no external calendar is written and
          no attendee is notified (a provider calendar-write connector + OAuth would be required, and
          remains pending). Propose new requests from <Link href="/scheduling" className="text-blue-400 hover:underline">Scheduling</Link>.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-zinc-400">No calendar write requests yet. Find a slot in Scheduling and click <strong>Propose write</strong>.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-semibold text-white">{r.title}</div>
                  <div className="text-xs text-zinc-400">{fmt(r.start)} → {r.end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · {r.action.replace(/_/g, " ")} · {r.provider || "local-only"}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-zinc-300">{STATUS_LABEL[r.status] || r.status}</span>
                  <WriteRequestActions id={r.id} status={r.status} />
                </div>
              </div>
              {r.preview && (
                <div className="mt-2 text-[11px] text-zinc-400 flex items-start gap-1">
                  {r.preview.hasConflicts ? <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5" /> : <ShieldCheck className="w-3 h-3 text-green-400 mt-0.5" />}
                  <span>{r.preview.impactSummary}</span>
                </div>
              )}
              {r.resultSummary && <p className="mt-1 text-[11px] text-zinc-500">{r.resultSummary}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
