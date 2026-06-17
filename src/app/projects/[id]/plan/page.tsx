import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectNav } from "../ProjectNav";

export const dynamic = "force-dynamic";

export default async function ProjectPlan({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { stages: { orderBy: { orderIndex: "asc" }, include: { tasks: { orderBy: { orderIndex: "asc" } } } }, tasks: { where: { stageId: null }, orderBy: { orderIndex: "asc" } } },
  });
  if (!project) notFound();

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{project.title} — Plan</h1>
      <ProjectNav id={id} active="Plan" />
      {project.stages.length === 0 && project.tasks.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center"><p className="text-zinc-400">No plan yet. Create the project from a goal to auto-decompose, or add tasks.</p></div>
      ) : (
        <div className="space-y-5">
          {project.stages.map((s) => (
            <div key={s.id}>
              <h2 className="text-sm font-bold text-zinc-300 mb-2">{s.orderIndex + 1}. {s.name}</h2>
              <ul className="space-y-1.5">
                {s.tasks.map((t) => (
                  <li key={t.id} className="glass-card rounded-lg p-2.5 flex items-center justify-between text-sm">
                    <span className="text-zinc-200">{t.title}</span>
                    <span className="text-[10px] text-zinc-500">{t.estimateMins}m · P{t.priority}{t.dueDate ? ` · ${t.dueDate.toLocaleDateString()}` : ""} · {t.status}</span>
                  </li>
                ))}
                {s.tasks.length === 0 && <li className="text-xs text-zinc-500">No tasks in this stage.</li>}
              </ul>
            </div>
          ))}
          {project.tasks.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-zinc-300 mb-2">Unstaged tasks</h2>
              <ul className="space-y-1.5">{project.tasks.map((t) => <li key={t.id} className="glass-card rounded-lg p-2.5 text-sm text-zinc-200">{t.title}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
