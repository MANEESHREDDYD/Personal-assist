import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, Clock, FileText, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { statusLabel } from "@/lib/schedulingSecretary/conversations";
import type { ConversationStatus } from "@/lib/schedulingSecretary/types";
import { getWorkingHours } from "@/app/actions/scheduling";
import { WorkspaceActions, SlotPicker, SaveDraftButton } from "./Workspace";

export const dynamic = "force-dynamic";

const SLOT_INTENTS = new Set(["schedule", "propose_times", "reschedule", "hold_time"]);

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const convo = await prisma.schedulingConversation.findUnique({
    where: { id },
    include: {
      instruction: true, participants: true,
      candidateSlots: { orderBy: { score: "desc" } },
      replyDrafts: { orderBy: { createdAt: "desc" } },
      followUpRules: { orderBy: { dueAt: "asc" } },
    },
  });
  if (!convo) notFound();
  const wh = await getWorkingHours();
  const tz = wh.timezone;
  const fmt = (d: Date) => d.toLocaleString(undefined, { timeZone: tz, weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const cwr = convo.calendarWriteRequestId
    ? await prisma.calendarWriteRequest.findUnique({ where: { id: convo.calendarWriteRequestId }, include: { preview: true } })
    : null;

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <Link href="/assistant/scheduling" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> All conversations</Link>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{convo.title}</h1>
          <p className="text-sm text-zinc-400">{convo.intent.replace(/_/g, " ")} · times in {tz}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-zinc-300">{statusLabel(convo.status as ConversationStatus)}</span>
      </div>

      {/* Parsed intent */}
      <section className="glass-card rounded-xl p-4 mb-4">
        <h2 className="font-bold text-white mb-2 text-sm">Parsed request</h2>
        <p className="text-xs text-zinc-400 italic mb-2">&quot;{convo.instruction?.rawText}&quot;</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-zinc-300">
          <div><span className="text-zinc-500">Intent:</span> {convo.intent}</div>
          <div><span className="text-zinc-500">Duration:</span> {convo.instruction?.durationMins ?? "—"} min</div>
          <div><span className="text-zinc-500">Time pref:</span> {convo.instruction?.timePreference ?? "any"}</div>
          <div><span className="text-zinc-500">Urgency:</span> {convo.instruction?.urgency ?? "normal"}</div>
          <div><span className="text-zinc-500">Range:</span> {convo.instruction?.rangeStart ? fmt(convo.instruction.rangeStart) : "—"} → {convo.instruction?.rangeEnd ? fmt(convo.instruction.rangeEnd) : "—"}</div>
          <div><span className="text-zinc-500">Confidence:</span> {Math.round((convo.instruction?.parserConfidence ?? 0) * 100)}%</div>
        </div>
      </section>

      {/* Participants */}
      <section className="glass-card rounded-xl p-4 mb-4">
        <h2 className="font-bold text-white mb-2 text-sm flex items-center gap-1"><Users className="w-4 h-4 text-blue-400" /> Participants</h2>
        {convo.participants.length === 0 ? <p className="text-xs text-zinc-500">No participants extracted.</p> : (
          <ul className="text-sm text-zinc-300 space-y-1">{convo.participants.map((p) => <li key={p.id}>{p.name}{p.email ? ` · ${p.email}` : ""} <span className="text-[10px] text-zinc-500">{p.role}</span></li>)}</ul>
        )}
      </section>

      {/* Actions */}
      <section className="mb-4">
        <WorkspaceActions id={convo.id} canGenerateSlots={SLOT_INTENTS.has(convo.intent)} />
      </section>

      {/* Candidate slots */}
      <section className="glass-card rounded-xl p-4 mb-4">
        <h2 className="font-bold text-white mb-2 text-sm flex items-center gap-1"><Clock className="w-4 h-4 text-purple-400" /> Candidate slots</h2>
        {convo.candidateSlots.length === 0 ? (
          <p className="text-xs text-zinc-500">{SLOT_INTENTS.has(convo.intent) ? "Generate candidate slots above." : "This intent does not require candidate slots."}</p>
        ) : (
          <SlotPicker id={convo.id} slots={convo.candidateSlots.map((s) => ({ id: s.id, label: `${fmt(s.start)} → ${s.end.toLocaleTimeString(undefined, { timeZone: tz, hour: "2-digit", minute: "2-digit" })}`, reason: s.reason, selected: s.selected }))} />
        )}
      </section>

      {cwr && (
        <section className="glass-card rounded-xl p-4 mb-4 border border-amber-500/20">
          <h2 className="font-bold text-white mb-1 text-sm">Linked calendar write request</h2>
          <p className="text-xs text-zinc-400">{cwr.title} · status: {cwr.status} · {cwr.provider || "local-only"}</p>
          {cwr.preview && <p className="text-[11px] text-zinc-500 mt-1">{cwr.preview.impactSummary}</p>}
          <Link href="/calendar/write-requests" className="text-xs text-blue-400 hover:underline">Approve / execute in Calendar Write Requests →</Link>
        </section>
      )}

      {/* Drafts */}
      <section className="glass-card rounded-xl p-4 mb-4">
        <h2 className="font-bold text-white mb-2 text-sm flex items-center gap-1"><FileText className="w-4 h-4 text-green-400" /> Reply drafts (never sent)</h2>
        {convo.replyDrafts.length === 0 ? <p className="text-xs text-zinc-500">No drafts yet. Generate one above.</p> : (
          <div className="space-y-2">
            {convo.replyDrafts.map((d) => (
              <div key={d.id} className="bg-black/20 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-zinc-500 uppercase tracking-wider">{d.kind.replace(/_/g, " ")}</span>
                  <SaveDraftButton replyDraftId={d.id} saved={!!d.emailDraftId} />
                </div>
                <div className="font-medium text-white text-sm">{d.subject}</div>
                <pre className="whitespace-pre-wrap text-xs text-zinc-300 mt-1">{d.body}</pre>
              </div>
            ))}
          </div>
        )}
      </section>

      {convo.followUpRules.length > 0 && (
        <section className="glass-card rounded-xl p-4 mb-4">
          <h2 className="font-bold text-white mb-2 text-sm">Follow-ups</h2>
          <ul className="text-xs text-zinc-300 space-y-1">
            {convo.followUpRules.map((f) => <li key={f.id}>Due {fmt(f.dueAt)} · every {f.intervalHours}h · {f.status}</li>)}
          </ul>
        </section>
      )}

      <p className="text-[11px] text-zinc-500 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Drafts are local and never sent. Calendar changes require an approval-gated write request; provider execution stays unavailable until OAuth.
      </p>
    </div>
  );
}
