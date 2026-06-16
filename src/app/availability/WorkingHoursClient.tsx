"use client";

import { useState, useTransition } from "react";
import { saveWorkingHours } from "@/app/actions/scheduling";
import type { WorkingDay } from "@/lib/scheduling/engine";
import { Save, Loader2 } from "lucide-react";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toTime(min: number) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
function fromTime(v: string) {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function WorkingHoursClient({ initial }: { initial: { timezone: string; days: WorkingDay[] } }) {
  const [timezone, setTimezone] = useState(initial.timezone);
  const [days, setDays] = useState<WorkingDay[]>(initial.days);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function update(day: number, patch: Partial<WorkingDay>) {
    setDays((prev) => prev.map((d) => (d.day === day ? { ...d, ...patch } : d)));
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveWorkingHours({ timezone, days });
      setMsg(res.success ? "Saved." : res.error || "Save failed");
    });
  }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4">
        <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Timezone (IANA)</label>
        <input
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="America/New_York"
          className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
        />
      </div>

      <div className="glass-card rounded-xl p-4 space-y-2">
        {[1, 2, 3, 4, 5, 6, 0].map((dn) => {
          const d = days.find((x) => x.day === dn) ?? { day: dn, enabled: false, startMinute: 540, endMinute: 1020 };
          return (
            <div key={dn} className="flex items-center gap-3 text-sm">
              <label className="w-24 flex items-center gap-2 text-zinc-300">
                <input type="checkbox" checked={d.enabled} onChange={(e) => update(dn, { enabled: e.target.checked })} />
                {DAY_NAMES[dn]}
              </label>
              <input type="time" value={toTime(d.startMinute)} disabled={!d.enabled}
                onChange={(e) => update(dn, { startMinute: fromTime(e.target.value) })}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white disabled:opacity-40" />
              <span className="text-zinc-500">to</span>
              <input type="time" value={toTime(d.endMinute)} disabled={!d.enabled}
                onChange={(e) => update(dn, { endMinute: fromTime(e.target.value) })}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white disabled:opacity-40" />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save working hours
        </button>
        {msg && <span className="text-xs text-zinc-400">{msg}</span>}
      </div>
    </div>
  );
}
