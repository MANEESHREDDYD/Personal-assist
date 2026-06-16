"use client";

import { useState, useTransition } from "react";
import { Save, Loader2 } from "lucide-react";
import { savePlannerPreference } from "@/app/actions/planner";

interface Pref { weeklyFocusGoalHrs: number; minFocusBlockMins: number; preferFocusMornings: boolean; maxMeetingHoursDay: number }

export function FocusClient({ initial }: { initial: Pref }) {
  const [p, setP] = useState<Pref>(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const num = (v: string) => (v === "" ? 0 : Number(v));

  function save() {
    setMsg(null);
    startTransition(async () => { const r = await savePlannerPreference(p); setMsg(r.success ? "Saved." : r.error || "Failed"); });
  }

  return (
    <div className="glass-card rounded-xl p-5 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <label className="block"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Weekly focus goal (hrs)</span>
          <input type="number" value={p.weeklyFocusGoalHrs} onChange={(e) => setP({ ...p, weeklyFocusGoalHrs: num(e.target.value) })} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Min focus block (min)</span>
          <input type="number" value={p.minFocusBlockMins} onChange={(e) => setP({ ...p, minFocusBlockMins: num(e.target.value) })} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Max meeting hours / day</span>
          <input type="number" value={p.maxMeetingHoursDay} onChange={(e) => setP({ ...p, maxMeetingHoursDay: num(e.target.value) })} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" /></label>
        <label className="flex items-center gap-2 text-zinc-300 pt-6"><input type="checkbox" checked={p.preferFocusMornings} onChange={(e) => setP({ ...p, preferFocusMornings: e.target.checked })} /> Prefer focus in the mornings</label>
      </div>
      <button onClick={save} disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save focus policy
      </button>
      {msg && <span className="ml-3 text-xs text-zinc-400">{msg}</span>}
    </div>
  );
}
