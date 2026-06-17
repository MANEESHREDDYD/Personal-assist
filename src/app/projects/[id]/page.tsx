import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { projectProgress, blockedTaskIds } from "@/lib/projects/dependencies";
import { ProjectNav } from "./ProjectNav";

export const dynamic = "force-dynamic";

export default async function ProjectOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { stages: { orderBy: { orderIndex: "asc" }, include: { _count: { select: { tasks: true } } } }, tasks: { include: { dependsOn: true } }, risks: { where: { resolved: false } } },
  });
  if (!project) notFound();
  const nodes = project.tasks.map((t) => ({ id: t.id, status: t.status, estimateMins: t.estimateMins, priority: t.priority, dependsOn: t.dependsOn.map((d) => d.prerequisiteTaskId) }));
  const blocked = blockedTaskIds(nodes);
  const progress = Math.round(projectProgress(project.tasks) * 100);
  const high = project.risks.filter((r) => r.level === "high" || r.level === "critical").length;

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <Link href="/projects" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> All projects</Link>
      <h1 className="text-2xl font-bold text-white">{project.title}</h1>
      <p className="text-sm text-zinc-400 mb-4">{project.status} · {progress}% complete{project.targetDate ? ` · target ${project.targetDate.toLocaleDateString()}` : ""}{project.owner ? ` · owner ${project.owner}` : ""}</p>
      <ProjectNav id={id} active="Overview" />

      {project.description && <p className="text-sm text-zinc-300 mb-4">{project.description}</p>}

      <div className="grid sm:grid-cols-4 gap-2 mb-6">
        <Stat label="Progress" value={`${progress}%`} />
        <Stat label="Tasks" value={`${project.tasks.length}`} />
        <Stat label="Blocked" value={`${blocked.length}`} />
        <Stat label="High risks" value={`${high}`} />
      </div>

      <section className="glass-card rounded-xl p-4 mb-4">
        <h2 className="font-bold text-white text-sm mb-2">Stages</h2>
        {project.stages.length === 0 ? <p className="text-sm text-zinc-500">No stages. <Link href={`/projects/${id}/tasks`} className="text-blue-400 hover:underline">Add tasks</Link> or create from a goal.</p> : (
          <ol className="space-y-1 text-sm text-zinc-300">
            {project.stages.map((s) => <li key={s.id} className="flex justify-between"><span>{s.orderIndex + 1}. {s.name}</span><span className="text-xs text-zinc-500">{s._count.tasks} task(s)</span></li>)}
          </ol>
        )}
      </section>

      <p className="text-[11px] text-zinc-500 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Heuristic decision-support only. No provider writes, no email, no silent scheduling.</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="glass-card rounded-xl p-3 text-center"><p className="text-[11px] text-zinc-500">{label}</p><p className="text-xl font-bold text-white">{value}</p></div>;
}
