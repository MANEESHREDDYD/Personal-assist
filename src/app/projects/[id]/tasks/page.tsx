import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectNav } from "../ProjectNav";
import { TasksBoard } from "../ProjectClients";

export const dynamic = "force-dynamic";

export default async function ProjectTasks({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { tasks: { orderBy: { orderIndex: "asc" }, include: { dependsOn: true } } } });
  if (!project) notFound();
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{project.title} — Tasks</h1>
      <ProjectNav id={id} active="Tasks" />
      <TasksBoard projectId={id} tasks={project.tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, estimateMins: t.estimateMins, plannerTaskId: t.plannerTaskId, dueDate: t.dueDate ? t.dueDate.toISOString() : null, deps: t.dependsOn.map((d) => d.prerequisiteTaskId) }))} />
    </div>
  );
}
