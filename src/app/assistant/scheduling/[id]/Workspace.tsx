"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, FileText, Save, CalendarPlus, Bell, CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  generateCandidateSlots, generateReplyDraft, saveReplyAsEmailDraft,
  selectCandidateSlot, createCalendarRequestFromConversation, createFollowUpRule, cancelConversation,
} from "@/app/actions/schedulingSecretary";

export function WorkspaceActions({ id, canGenerateSlots }: { id: string; canGenerateSlots: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function act(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => { const r = await fn(); if (!r.success && r.error) alert(r.error); router.refresh(); });
  }
  return (
    <div className="flex flex-wrap gap-2">
      {canGenerateSlots && (
        <button onClick={() => act(() => generateCandidateSlots(id))} disabled={pending} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50">
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Generate candidate slots
        </button>
      )}
      <button onClick={() => act(() => generateReplyDraft(id, "propose_times"))} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><FileText className="w-3 h-3" /> Propose-times draft</button>
      <button onClick={() => act(() => generateReplyDraft(id, "confirmation"))} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><FileText className="w-3 h-3" /> Confirmation draft</button>
      <button onClick={() => act(() => generateReplyDraft(id, "follow_up"))} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><FileText className="w-3 h-3" /> Follow-up draft</button>
      <button onClick={() => act(() => createFollowUpRule(id))} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><Bell className="w-3 h-3" /> Track follow-up</button>
      <button onClick={() => act(() => cancelConversation(id))} disabled={pending} className="px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><XCircle className="w-3 h-3" /> Cancel</button>
    </div>
  );
}

export function SlotPicker({ id, slots }: { id: string; slots: { id: string; label: string; reason: string | null; selected: boolean }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function select(slotId: string) { startTransition(async () => { await selectCandidateSlot(id, slotId); router.refresh(); }); }
  function createRequest() { startTransition(async () => { const r = await createCalendarRequestFromConversation(id); if (!r.success && r.error) alert(r.error); router.refresh(); }); }
  const hasSelected = slots.some((s) => s.selected);
  return (
    <div className="space-y-2">
      {slots.map((s) => (
        <button key={s.id} onClick={() => select(s.id)} disabled={pending} className={`w-full text-left px-3 py-2 rounded-lg border text-sm flex items-center justify-between ${s.selected ? "border-blue-500 bg-blue-500/15 text-white" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30"}`}>
          <span>{s.label} <span className="text-[10px] text-zinc-500 ml-1">{s.reason}</span></span>
          {s.selected && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
        </button>
      ))}
      {hasSelected && (
        <button onClick={createRequest} disabled={pending} className="mt-2 px-4 py-2 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarPlus className="w-4 h-4" />} Create calendar write request (approval-gated)
        </button>
      )}
    </div>
  );
}

export function SaveDraftButton({ replyDraftId, saved }: { replyDraftId: string; saved: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  if (saved) return <span className="text-[11px] text-green-400">Saved to Drafts</span>;
  return (
    <button onClick={() => startTransition(async () => { await saveReplyAsEmailDraft(replyDraftId); router.refresh(); })} disabled={pending} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] flex items-center gap-1 disabled:opacity-50">
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Save as local draft
    </button>
  );
}
