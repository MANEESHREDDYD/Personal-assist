"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ShieldAlert, BarChart3, FileText, CalendarPlus, CheckCircle2, Link2 } from "lucide-react";
import {
  addProjectTask, setProjectTaskStatus, addDependency, convertTaskToPlanner, scheduleProjectTasks,
  scoreRisks, runForecast, generateStatusUpdate, linkProjectDocument,
} from "@/app/actions/projects";
import type { UpdateKind } from "@/lib/projects/statusUpdates";

function useAct() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function act(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => { const r = await fn(); if (!r.success && r.error) alert(r.error); router.refresh(); });
  }
  return { pending, act };
}

const STATUSES = ["todo", "in_progress", "blocked", "done", "canceled"];

export function TasksBoard({ projectId, tasks }: { projectId: string; tasks: { id: string; title: string; status: string; priority: number; estimateMins: number; plannerTaskId: string | null; dueDate: string | null; deps: string[] }[] }) {
  const { pending, act } = useAct();
  const [title, setTitle] = useState("");
  const [est, setEst] = useState(60);
  const [depFrom, setDepFrom] = useState("");
  const [depTo, setDepTo] = useState("");

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4 flex flex-wrap gap-2 items-end">
        <label className="block flex-1 min-w-[160px]"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">New task</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></label>
        <label className="block w-24"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Est (min)</span>
          <input type="number" value={est} onChange={(e) => setEst(Number(e.target.value) || 60)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></label>
        <button onClick={() => { if (title.trim()) { act(() => addProjectTask(projectId, { title, estimateMins: est })); setTitle(""); } }} disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => act(() => scheduleProjectTasks(projectId))} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><CalendarPlus className="w-3 h-3" /> Send open tasks to planner</button>
      </div>

      {tasks.length === 0 ? <p className="text-sm text-zinc-500">No tasks. Add one above or decompose from a goal.</p> : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="glass-card rounded-lg p-3 flex items-center justify-between gap-2 text-sm flex-wrap">
              <div className="min-w-0">
                <div className="text-white font-medium">{t.title}</div>
                <div className="text-xs text-zinc-400">P{t.priority} · {t.estimateMins} min{t.dueDate ? ` · due ${new Date(t.dueDate).toLocaleDateString()}` : ""}{t.deps.length ? ` · depends on ${t.deps.length}` : ""}{t.plannerTaskId ? " · in planner" : ""}</div>
              </div>
              <div className="flex items-center gap-2">
                <select value={t.status} onChange={(e) => act(() => setProjectTaskStatus(t.id, e.target.value))} className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs">{STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
                {!t.plannerTaskId && <button onClick={() => act(() => convertTaskToPlanner(t.id))} disabled={pending} className="p-1.5 text-blue-400 hover:text-blue-300" title="Convert to planner task"><Link2 className="w-4 h-4" /></button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-bold text-white mb-2">Add dependency</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={depFrom} onChange={(e) => setDepFrom(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs max-w-[180px]"><option value="">Task…</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
          <span className="text-zinc-500 text-xs">depends on</span>
          <select value={depTo} onChange={(e) => setDepTo(e.target.value)} className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-xs max-w-[180px]"><option value="">Prerequisite…</option>{tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
          <button onClick={() => { if (depFrom && depTo) act(() => addDependency(projectId, depFrom, depTo)); }} disabled={pending || !depFrom || !depTo} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs disabled:opacity-50">Add</button>
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">Circular dependencies are rejected automatically.</p>
      </div>
    </div>
  );
}

export function ScoreRisksButton({ projectId }: { projectId: string }) {
  const { pending, act } = useAct();
  return <button onClick={() => act(() => scoreRisks(projectId))} disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />} Re-score risks</button>;
}

export function ForecastButton({ projectId }: { projectId: string }) {
  const { pending, act } = useAct();
  return <button onClick={() => act(() => runForecast(projectId))} disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />} Run forecast</button>;
}

export function StatusGenerator({ projectId }: { projectId: string }) {
  const { pending, act } = useAct();
  const kinds: { k: UpdateKind; label: string }[] = [
    { k: "status", label: "Status" }, { k: "brief", label: "Brief" }, { k: "blocker", label: "Blockers" },
    { k: "decision_memo", label: "Decision memo" }, { k: "stakeholder", label: "Stakeholder" }, { k: "next_actions", label: "Next actions" },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {kinds.map((x) => <button key={x.k} onClick={() => act(() => generateStatusUpdate(projectId, x.k))} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><FileText className="w-3 h-3" /> {x.label}</button>)}
    </div>
  );
}

export function DocumentLinker({ projectId, documents }: { projectId: string; documents: { id: string; name: string }[] }) {
  const { pending, act } = useAct();
  const [docId, setDocId] = useState("");
  const [title, setTitle] = useState("");
  return (
    <div className="glass-card rounded-xl p-4 flex flex-wrap items-end gap-2">
      <label className="block flex-1 min-w-[160px]"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Note / title</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Spec, contract, notes…" className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></label>
      <label className="block"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Local document (optional)</span>
        <select value={docId} onChange={(e) => setDocId(e.target.value)} className="mt-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="">None</option>{documents.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <button onClick={() => { if (title.trim()) { act(() => linkProjectDocument(projectId, { documentId: docId || null, title })); setTitle(""); setDocId(""); } }} disabled={pending || !title.trim()} className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50">{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Link</button>
    </div>
  );
}
