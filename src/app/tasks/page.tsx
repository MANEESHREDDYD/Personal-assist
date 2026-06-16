import Link from "next/link";
import { ListChecks } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { TasksClient } from "./TasksClient";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const tasks = await prisma.plannerTask.findMany({ orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "desc" }], take: 100 });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><ListChecks className="text-blue-400" /> Tasks</h1>
        <p className="text-zinc-400">Capture tasks with priority, estimate, and due date. The <Link href="/optimizer" className="text-blue-400 hover:underline">optimizer</Link> schedules them into open time (approval-gated).</p>
      </div>
      <TasksClient tasks={tasks.map((t) => ({ id: t.id, title: t.title, priority: t.priority, estimateMins: t.estimateMins, dueDate: t.dueDate ? t.dueDate.toISOString() : null, status: t.status, requiresFocus: t.requiresFocus }))} />
    </div>
  );
}
