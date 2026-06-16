"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Loader2, CheckCircle2 } from "lucide-react";
import { createTask, deleteTask, setTaskStatus } from "@/app/actions/planner";

interface Task { id: string; title: string; priority: number; estimateMins: number; dueDate: string | null; status: string; requiresFocus: boolean }

export function TasksClient({ tasks }: { tasks: Task[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState(3);
  const [estimate, setEstimate] = useState(30);
  const [due, setDue] = useState("");
  const [focus, setFocus] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await createTask({ title, priority, estimateMins: estimate, dueDate: due || null, requiresFocus: focus });
      if (res.success) { setTitle(""); setDue(""); router.refresh(); } else setError(res.error || "Failed");
    });
  }
  function act(fn: () => Promise<unknown>) { startTransition(async () => { await fn(); router.refresh(); }); }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4 grid sm:grid-cols-6 gap-2 items-end">
        <label className="block sm:col-span-2"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Task</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Finish report" className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Priority</span>
          <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">{[1, 2, 3, 4, 5].map((p) => <option key={p} value={p}>P{p}</option>)}</select></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Est (min)</span>
          <input type="number" value={estimate} onChange={(e) => setEstimate(Number(e.target.value) || 30)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></label>
        <label className="block"><span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold">Due</span>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></label>
        <label className="flex items-center gap-1 text-xs text-zinc-300 pb-2"><input type="checkbox" checked={focus} onChange={(e) => setFocus(e.target.checked)} /> focus</label>
        <button onClick={add} disabled={pending || !title.trim()} className="sm:col-span-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add task
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {tasks.length === 0 ? (
        <p className="text-sm text-zinc-500">No tasks yet. Add one above, then run the optimizer to schedule it.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="glass-card rounded-xl p-3 flex items-center justify-between text-sm">
              <div>
                <Link href={`/tasks/${t.id}`} className="font-medium text-white hover:underline">{t.title}</Link>
                <div className="text-xs text-zinc-400">P{t.priority} · {t.estimateMins} min{t.dueDate ? ` · due ${new Date(t.dueDate).toLocaleDateString()}` : ""} · {t.status}{t.requiresFocus ? " · focus" : ""}</div>
              </div>
              <div className="flex items-center gap-2">
                {t.status !== "done" && <button onClick={() => act(() => setTaskStatus(t.id, "done"))} className="p-1.5 text-green-400 hover:text-green-300" title="Mark done"><CheckCircle2 className="w-4 h-4" /></button>}
                <button onClick={() => act(() => deleteTask(t.id))} className="p-1.5 text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
