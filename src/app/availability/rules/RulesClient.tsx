"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAvailabilityRule, deleteAvailabilityRule } from "@/app/actions/scheduling";
import { Plus, Trash2, Loader2 } from "lucide-react";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const dayLabel = (d: number | null) => (d == null ? "Every day" : WEEKDAYS[d] ?? "day");

interface Rule {
  id: string; label: string; kind: string; dayOfWeek: number | null; startMinute: number; endMinute: number;
}

function toTime(min: number) {
  return `${Math.floor(min / 60).toString().padStart(2, "0")}:${(min % 60).toString().padStart(2, "0")}`;
}
function fromTime(v: string) { const [h, m] = v.split(":").map(Number); return h * 60 + (m || 0); }

export function RulesClient({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState("do_not_schedule");
  const [day, setDay] = useState<string>("any");
  const [start, setStart] = useState("12:00");
  const [end, setEnd] = useState("13:00");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await createAvailabilityRule({
        label: label || (kind === "do_not_schedule" ? "Do not schedule" : "Break"),
        kind,
        dayOfWeek: day === "any" ? null : Number(day),
        startMinute: fromTime(start), endMinute: fromTime(end),
      });
      if (res.success) { setLabel(""); router.refresh(); }
      else setError(res.error || "Failed");
    });
  }

  function remove(id: string) {
    startTransition(async () => { await deleteAvailabilityRule(id); router.refresh(); });
  }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4 grid sm:grid-cols-2 gap-3">
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
          <option value="do_not_schedule">Do not schedule</option>
          <option value="break">Break</option>
          <option value="preferred_window">Preferred window</option>
        </select>
        <select value={day} onChange={(e) => setDay(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
          <option value="any">Every day</option>
          {[1, 2, 3, 4, 5, 6, 0].map((d) => <option key={d} value={d}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]}</option>)}
        </select>
        <div className="flex items-center gap-2 text-sm">
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white" />
          <span className="text-zinc-500">to</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white" />
        </div>
        <button onClick={add} disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add rule
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {rules.length === 0 ? (
        <p className="text-sm text-zinc-500">No rules yet. Add a do-not-schedule or break window above.</p>
      ) : (
        <ul className="space-y-2">
          {rules.map((r) => (
            <li key={r.id} className="flex items-center justify-between glass-card rounded-lg p-3 text-sm">
              <span className="text-zinc-200">
                <strong className="text-white">{r.label}</strong> · {r.kind.replace(/_/g, " ")} · {dayLabel(r.dayOfWeek)} · {toTime(r.startMinute)}–{toTime(r.endMinute)}
              </span>
              <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
