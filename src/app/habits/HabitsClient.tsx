"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { createHabit, deleteHabit } from "@/app/actions/planner";

interface Habit { id: string; name: string; frequency: string; durationMins: number; windowStartMin: number; windowEndMin: number }
const toTime = (m: number) => `${Math.floor(m / 60).toString().padStart(2, "0")}:${(m % 60).toString().padStart(2, "0")}`;
const fromTime = (v: string) => { const [h, m] = v.split(":").map(Number); return h * 60 + (m || 0); };

export function HabitsClient({ habits }: { habits: Habit[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [freq, setFreq] = useState("daily");
  const [dur, setDur] = useState(30);
  const [ws, setWs] = useState("07:00");
  const [we, setWe] = useState("09:00");
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await createHabit({ name, frequency: freq, durationMins: dur, windowStartMin: fromTime(ws), windowEndMin: fromTime(we) });
      if (res.success) { setName(""); router.refresh(); } else setError(res.error || "Failed");
    });
  }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4 grid sm:grid-cols-5 gap-2 items-end">
        <label className="block sm:col-span-2"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Habit</span>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Daily reading" className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Frequency</span>
          <select value={freq} onChange={(e) => setFreq(e.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Duration</span>
          <input type="number" value={dur} onChange={(e) => setDur(Number(e.target.value) || 30)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></label>
        <div className="flex items-center gap-1 text-sm"><input type="time" value={ws} onChange={(e) => setWs(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white" /><span className="text-zinc-500">–</span><input type="time" value={we} onChange={(e) => setWe(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white" /></div>
        <button onClick={add} disabled={pending || !name.trim()} className="sm:col-span-5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add habit
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {habits.length === 0 ? <p className="text-sm text-zinc-500">No habits yet.</p> : (
        <ul className="space-y-2">
          {habits.map((h) => (
            <li key={h.id} className="glass-card rounded-xl p-3 flex items-center justify-between text-sm">
              <span className="text-zinc-200"><strong className="text-white">{h.name}</strong> · {h.frequency} · {h.durationMins} min · {toTime(h.windowStartMin)}–{toTime(h.windowEndMin)}</span>
              <button onClick={() => startTransition(async () => { await deleteHabit(h.id); router.refresh(); })} className="p-1.5 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
