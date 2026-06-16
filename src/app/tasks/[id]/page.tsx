import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TaskDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await prisma.plannerTask.findUnique({ where: { id }, include: { schedules: { orderBy: { start: "asc" } } } });
  if (!task) notFound();
  return (
    <div className="p-8 max-w-2xl mx-auto w-full">
      <Link href="/tasks" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> All tasks</Link>
      <h1 className="text-2xl font-bold text-white mb-1">{task.title}</h1>
      <p className="text-sm text-zinc-400 mb-4">P{task.priority} · {task.estimateMins} min · {task.status}{task.dueDate ? ` · due ${task.dueDate.toLocaleString()}` : ""}{task.requiresFocus ? " · requires focus" : ""}</p>
      {task.description && <p className="text-sm text-zinc-300 mb-4">{task.description}</p>}
      <section className="glass-card rounded-xl p-4">
        <h2 className="font-bold text-white text-sm mb-2">Scheduled blocks</h2>
        {task.schedules.length === 0 ? (
          <p className="text-sm text-zinc-500">Not scheduled yet. Run the <Link href="/optimizer" className="text-blue-400 hover:underline">optimizer</Link> and approve the proposal.</p>
        ) : (
          <ul className="text-sm text-zinc-300 space-y-1">
            {task.schedules.map((s) => <li key={s.id}>{s.start.toLocaleString()} → {s.end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} · {s.status}</li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
