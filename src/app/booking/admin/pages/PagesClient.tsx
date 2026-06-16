"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createBookingPage } from "@/app/actions/booking";

export function PagesClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [error, setError] = useState<string | null>(null);

  function create() {
    setError(null);
    startTransition(async () => {
      const res = await createBookingPage({ title, ownerName, timezone });
      if (res.success) { setTitle(""); setOwnerName(""); router.refresh(); }
      else setError(res.error || "Failed");
    });
  }

  return (
    <div className="glass-card rounded-xl p-4 grid sm:grid-cols-3 gap-3 items-end">
      <label className="block">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Page title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book time with me" className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
      </label>
      <label className="block">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Owner name</span>
        <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Optional" className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
      </label>
      <label className="block">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Timezone</span>
        <input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
      </label>
      <button onClick={create} disabled={pending || !title.trim()} className="sm:col-span-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create booking page
      </button>
      {error && <p className="sm:col-span-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}
