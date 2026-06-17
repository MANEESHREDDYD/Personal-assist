"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Plus, Loader2 } from "lucide-react";
import { createProject, createProjectFromText } from "@/app/actions/projects";

const EXAMPLES = [
  "Build a portfolio website in two weeks",
  "Launch a fundraising outreach campaign",
  "Prepare for final exams",
  "Ship Phase 6E project manager",
  "Plan a customer discovery sprint",
];

export function ProjectsClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);

  function fromText(value?: string) {
    const t = value ?? text;
    if (!t.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createProjectFromText({ text: t, targetDate: target || null });
      if (res.success && res.id) router.push(`/projects/${res.id}`);
      else setError(res.error || "Failed");
    });
  }
  function manual() {
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createProject({ title, targetDate: target || null });
      if (res.success && res.id) router.push(`/projects/${res.id}`);
      else setError(res.error || "Failed");
    });
  }

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-bold text-white mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> Create from a goal</h2>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder='e.g. "Build a portfolio website in two weeks"' className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 text-sm" />
        <div className="flex flex-wrap gap-2 mt-2">
          {EXAMPLES.map((ex) => <button key={ex} onClick={() => fromText(ex)} disabled={pending} className="px-3 py-1.5 bg-black/30 border border-white/10 rounded-full text-xs text-zinc-300 hover:text-white hover:border-white/30 disabled:opacity-50">{ex}</button>)}
        </div>
        <button onClick={() => fromText()} disabled={pending || !text.trim()} className="mt-3 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Decompose into a plan
        </button>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-bold text-white mb-2 flex items-center gap-2"><Plus className="w-4 h-4 text-blue-400" /> Or create manually</h2>
        <div className="grid sm:grid-cols-3 gap-2 items-end">
          <label className="block sm:col-span-2"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></label>
          <label className="block"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Target date</span>
            <input type="date" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></label>
        </div>
        <button onClick={manual} disabled={pending || !title.trim()} className="mt-3 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create project
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
