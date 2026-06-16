"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Loader2, Search, CalendarPlus, ShieldCheck } from "lucide-react";
import {
  saveSchedulingPreferences, previewAvailability, createCalendarWriteRequest,
} from "@/app/actions/scheduling";

interface Prefs {
  bufferBeforeMins: number; bufferAfterMins: number; maxMeetingsPerDay: number;
  maxMeetingHoursDay: number; minNoticeMins: number; lunchStartMinute: number | null;
  lunchEndMinute: number | null; slotGranularityMins: number;
}
interface SlotView { start: string; end: string; score: number; reason: string }

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function SchedulingClient({ initial }: { initial: Prefs }) {
  const router = useRouter();
  const [p, setP] = useState<Prefs>(initial);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Preview state
  const today = new Date();
  const inAWeek = new Date(today.getTime() + 7 * 86400000);
  const [rangeStart, setRangeStart] = useState(today.toISOString().slice(0, 10));
  const [rangeEnd, setRangeEnd] = useState(inAWeek.toISOString().slice(0, 10));
  const [duration, setDuration] = useState(30);
  const [slots, setSlots] = useState<SlotView[] | null>(null);
  const [previewMsg, setPreviewMsg] = useState<string | null>(null);
  const [title, setTitle] = useState("Meeting");
  const [proposedMsg, setProposedMsg] = useState<string | null>(null);

  function savePrefs() {
    setSavedMsg(null);
    startTransition(async () => {
      const res = await saveSchedulingPreferences(p);
      setSavedMsg(res.success ? "Preferences saved." : res.error || "Save failed");
    });
  }

  function preview() {
    setPreviewMsg(null); setSlots(null); setProposedMsg(null);
    startTransition(async () => {
      const res = await previewAvailability({
        rangeStart: new Date(rangeStart).toISOString(),
        rangeEnd: new Date(rangeEnd + "T23:59:59").toISOString(),
        durationMins: duration,
      });
      if (res.success) { setSlots(res.slots); setPreviewMsg(`${res.totalFound} free slot(s) found (showing top ${res.slots.length}, ${res.timezone}).`); }
      else setPreviewMsg(res.error || "Preview failed");
    });
  }

  function propose(slot: SlotView) {
    setProposedMsg(null);
    startTransition(async () => {
      const res = await createCalendarWriteRequest({
        action: "create_event", title, start: slot.start, end: slot.end, provider: null, notifyAttendees: false,
      });
      if (res.success) { setProposedMsg("Calendar write request created (pending approval). Nothing was written or sent."); router.refresh(); }
      else setProposedMsg(res.error || "Failed");
    });
  }

  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <div className="space-y-8">
      {/* Preferences */}
      <section className="glass-card rounded-xl p-5">
        <h2 className="font-bold text-white mb-3">Scheduling preferences</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <Field label="Buffer before (mins)"><input type="number" value={p.bufferBeforeMins} onChange={(e) => setP({ ...p, bufferBeforeMins: num(e.target.value) })} className={inputCls} /></Field>
          <Field label="Buffer after (mins)"><input type="number" value={p.bufferAfterMins} onChange={(e) => setP({ ...p, bufferAfterMins: num(e.target.value) })} className={inputCls} /></Field>
          <Field label="Max meetings / day"><input type="number" value={p.maxMeetingsPerDay} onChange={(e) => setP({ ...p, maxMeetingsPerDay: num(e.target.value) })} className={inputCls} /></Field>
          <Field label="Max meeting hours / day"><input type="number" value={p.maxMeetingHoursDay} onChange={(e) => setP({ ...p, maxMeetingHoursDay: num(e.target.value) })} className={inputCls} /></Field>
          <Field label="Min notice (mins)"><input type="number" value={p.minNoticeMins} onChange={(e) => setP({ ...p, minNoticeMins: num(e.target.value) })} className={inputCls} /></Field>
          <Field label="Slot granularity (mins)"><input type="number" value={p.slotGranularityMins} onChange={(e) => setP({ ...p, slotGranularityMins: num(e.target.value) })} className={inputCls} /></Field>
        </div>
        <button onClick={savePrefs} disabled={pending} className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save preferences
        </button>
        {savedMsg && <span className="ml-3 text-xs text-zinc-400">{savedMsg}</span>}
      </section>

      {/* Availability preview */}
      <section className="glass-card rounded-xl p-5">
        <h2 className="font-bold text-white mb-3">Find available times</h2>
        <div className="flex flex-wrap gap-3 text-sm items-end">
          <Field label="From"><input type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} className={inputCls} /></Field>
          <Field label="To"><input type="date" value={rangeEnd} onChange={(e) => setRangeEnd(e.target.value)} className={inputCls} /></Field>
          <Field label="Duration (mins)"><input type="number" value={duration} onChange={(e) => setDuration(num(e.target.value) || 30)} className={inputCls} /></Field>
          <Field label="Event title"><input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></Field>
          <button onClick={preview} disabled={pending} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Preview
          </button>
        </div>
        {previewMsg && <p className="text-xs text-zinc-400 mt-3">{previewMsg}</p>}

        {slots && slots.length === 0 && <p className="text-sm text-zinc-500 mt-3">No free slots in range. Adjust working hours, rules, or range.</p>}
        {slots && slots.length > 0 && (
          <ul className="mt-3 space-y-2">
            {slots.map((s, i) => (
              <li key={i} className="flex items-center justify-between bg-black/20 rounded-lg p-2 text-sm">
                <span className="text-zinc-200">{fmt(s.start)} → {new Date(s.end).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} <span className="text-[10px] text-zinc-500 ml-1">({s.reason})</span></span>
                <button onClick={() => propose(s)} disabled={pending} className="px-3 py-1 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 rounded text-xs flex items-center gap-1 disabled:opacity-50">
                  <CalendarPlus className="w-3 h-3" /> Propose write
                </button>
              </li>
            ))}
          </ul>
        )}
        {proposedMsg && (
          <p className="text-xs text-green-400 mt-3 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> {proposedMsg} <Link href="/calendar/write-requests" className="underline">Review requests</Link>
          </p>
        )}
      </section>

      <p className="text-[11px] text-zinc-500 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Proposing a write creates an approval-gated request only. No external calendar is written and no attendees are notified without explicit approval.
      </p>
    </div>
  );
}

const inputCls = "bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white w-full";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
