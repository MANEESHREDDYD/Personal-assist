import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RequestActions } from "../RequestActions";
import { DraftGenerator } from "./DraftGenerator";

export const dynamic = "force-dynamic";

export default async function BookingRequestDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const req = await prisma.bookingRequest.findUnique({
    where: { id },
    include: { meetingType: true, invitees: true, confirmationDrafts: { orderBy: { createdAt: "desc" } } },
  });
  if (!req) notFound();

  const answers: Record<string, unknown> = req.answersJson ? JSON.parse(req.answersJson) : {};
  const cwr = req.calendarWriteRequestId
    ? await prisma.calendarWriteRequest.findUnique({ where: { id: req.calendarWriteRequestId }, include: { preview: true } })
    : null;

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <Link href="/booking/requests" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> All requests</Link>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{req.meetingType.title}</h1>
          <p className="text-sm text-zinc-400">{req.invitees[0]?.name} · {req.slotStart.toLocaleString()} · {req.timezone} · status: {req.status}</p>
        </div>
        <RequestActions id={req.id} status={req.status} />
      </div>

      <section className="glass-card rounded-xl p-4 mb-4">
        <h2 className="font-bold text-white mb-2 text-sm">Invitee &amp; answers</h2>
        <ul className="text-sm text-zinc-300 space-y-1">
          {req.invitees.map((i) => <li key={i.id}>{i.name}{i.email ? ` · ${i.email}` : ""}{i.phone ? ` · ${i.phone}` : ""}</li>)}
          {Object.entries(answers).map(([k, v]) => <li key={k}><span className="text-zinc-500">{k}:</span> {String(v)}</li>)}
          {Object.keys(answers).length === 0 && <li className="text-zinc-500">No question answers.</li>}
        </ul>
        {req.routedTo && <p className="text-xs text-blue-400 mt-2">Routed → {req.routedTo}{req.routingReason ? ` (${req.routingReason})` : ""}</p>}
      </section>

      {cwr && (
        <section className="glass-card rounded-xl p-4 mb-4 border border-amber-500/20">
          <h2 className="font-bold text-white mb-1 text-sm">Linked calendar write request</h2>
          <p className="text-xs text-zinc-400">{cwr.title} · status: {cwr.status} · {cwr.provider || "local-only"}</p>
          {cwr.preview && <p className="text-[11px] text-zinc-500 mt-1">{cwr.preview.impactSummary}</p>}
          <Link href="/calendar/write-requests" className="text-xs text-blue-400 hover:underline">Manage in Calendar Write Requests →</Link>
        </section>
      )}

      <section className="glass-card rounded-xl p-4">
        <h2 className="font-bold text-white mb-2 text-sm">Local drafts (never sent)</h2>
        <DraftGenerator requestId={req.id} />
        <div className="mt-3 space-y-2">
          {req.confirmationDrafts.length === 0 ? (
            <p className="text-sm text-zinc-500">No drafts yet. Generate a confirmation, reminder, or follow-up draft above.</p>
          ) : req.confirmationDrafts.map((d) => (
            <div key={d.id} className="bg-black/20 rounded-lg p-3">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{d.kind.replace("_", " ")}</div>
              <div className="font-medium text-white text-sm">{d.subject}</div>
              <pre className="whitespace-pre-wrap text-xs text-zinc-300 mt-1">{d.body}</pre>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[11px] text-zinc-500 mt-4 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Drafts are local and not sent. Copy/export and send manually if you choose.
      </p>
    </div>
  );
}
