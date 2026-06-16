"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Loader2, Power, ExternalLink, HelpCircle, GitBranch } from "lucide-react";
import {
  createMeetingType, setMeetingTypeActive, deleteMeetingType, addBookingQuestion, addRoutingRule,
} from "@/app/actions/booking";
import { LOCATION_LABELS, type LocationType, type QuestionType } from "@/lib/booking/types";

interface MT {
  id: string; title: string; slug: string; durationMins: number; locationType: string;
  active: boolean; questionCount: number; routingCount: number;
}

export function MeetingTypesClient({ meetingTypes }: { meetingTypes: MT[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState<LocationType>("custom");
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await createMeetingType({ title, durationMins: duration, locationType: location });
      if (res.success) { setTitle(""); router.refresh(); }
      else setError(res.error || "Failed");
    });
  }
  function act(fn: () => Promise<unknown>) { startTransition(async () => { await fn(); router.refresh(); }); }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl p-4 grid sm:grid-cols-4 gap-3 items-end">
        <label className="block sm:col-span-2">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Intro Call" className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Duration (mins)</span>
          <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 30)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        </label>
        <label className="block">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Location</span>
          <select value={location} onChange={(e) => setLocation(e.target.value as LocationType)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
            {Object.entries(LOCATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <button onClick={create} disabled={pending || !title.trim()} className="sm:col-span-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create meeting type
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {meetingTypes.length === 0 ? (
        <p className="text-sm text-zinc-500">No meeting types yet. Create one above to generate a booking link.</p>
      ) : (
        <ul className="space-y-3">
          {meetingTypes.map((mt) => (
            <li key={mt.id} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold text-white flex items-center gap-2">
                    {mt.title}
                    {!mt.active && <span className="text-[10px] text-zinc-500 uppercase">inactive</span>}
                  </div>
                  <div className="text-xs text-zinc-400">{mt.durationMins} min · {mt.questionCount} question(s) · {mt.routingCount} routing rule(s)</div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/booking/${mt.slug}`} className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs flex items-center gap-1"><ExternalLink className="w-3 h-3" /> /booking/{mt.slug}</Link>
                  <button onClick={() => act(() => setMeetingTypeActive(mt.id, !mt.active))} className="p-1.5 text-zinc-400 hover:text-white" title="Toggle active"><Power className="w-4 h-4" /></button>
                  <button onClick={() => act(() => deleteMeetingType(mt.id))} className="p-1.5 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <button onClick={() => setExpanded(expanded === mt.id ? null : mt.id)} className="mt-2 text-xs text-blue-400 hover:underline">
                {expanded === mt.id ? "Hide" : "Add questions / routing"}
              </button>
              {expanded === mt.id && <Expand id={mt.id} onDone={() => router.refresh()} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Expand({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [qLabel, setQLabel] = useState("");
  const [qType, setQType] = useState<QuestionType>("short_text");
  const [qReq, setQReq] = useState(false);
  const [rLabel, setRLabel] = useState("");
  const [rQ, setRQ] = useState("");
  const [rVal, setRVal] = useState("");
  const [rRoute, setRRoute] = useState("");

  return (
    <div className="mt-3 grid sm:grid-cols-2 gap-4 border-t border-white/10 pt-3">
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1"><HelpCircle className="w-3 h-3" /> Add question</p>
        <input value={qLabel} onChange={(e) => setQLabel(e.target.value)} placeholder="Question label" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
        <div className="flex items-center gap-2 text-sm">
          <select value={qType} onChange={(e) => setQType(e.target.value as QuestionType)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white">
            {["short_text", "long_text", "email", "phone", "select", "checkbox"].map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
          <label className="flex items-center gap-1 text-zinc-300 text-xs"><input type="checkbox" checked={qReq} onChange={(e) => setQReq(e.target.checked)} /> required</label>
        </div>
        <button disabled={pending || !qLabel.trim()} onClick={() => startTransition(async () => { await addBookingQuestion(id, { label: qLabel, type: qType, required: qReq }); setQLabel(""); onDone(); })} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs disabled:opacity-50">Add question</button>
      </div>
      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold flex items-center gap-1"><GitBranch className="w-3 h-3" /> Add routing rule</p>
        <input value={rLabel} onChange={(e) => setRLabel(e.target.value)} placeholder="Rule label" className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
        <div className="flex items-center gap-1 text-sm">
          <input value={rQ} onChange={(e) => setRQ(e.target.value)} placeholder="Question label" className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white w-1/3 text-xs" />
          <span className="text-zinc-500 text-xs">equals</span>
          <input value={rVal} onChange={(e) => setRVal(e.target.value)} placeholder="value" className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white w-1/4 text-xs" />
          <span className="text-zinc-500 text-xs">→</span>
          <input value={rRoute} onChange={(e) => setRRoute(e.target.value)} placeholder="route to" className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white w-1/4 text-xs" />
        </div>
        <button disabled={pending || !rLabel.trim() || !rRoute.trim()} onClick={() => startTransition(async () => { await addRoutingRule(id, { label: rLabel, questionLabel: rQ || null, op: "equals", value: rVal || null, routeTo: rRoute }); setRLabel(""); setRRoute(""); onDone(); })} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs disabled:opacity-50">Add rule</button>
      </div>
    </div>
  );
}
