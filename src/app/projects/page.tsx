import Link from "next/link";
import { FolderKanban, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { projectProgress } from "@/lib/projects/dependencies";
import { ProjectsClient } from "./ProjectsClient";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({ orderBy: { updatedAt: "desc" }, take: 30, include: { tasks: { select: { status: true } }, _count: { select: { risks: true } } } });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><FolderKanban className="text-blue-400" /> Projects</h1>
        <p className="text-zinc-400">Motion-style AI project planning: decompose a goal into stages, tasks, and dependencies; forecast workload; track heuristic risks; and convert tasks into your planner — all local and approval-gated.</p>
      </div>
      <ProjectsClient />
      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-3">Your projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-zinc-500">No projects yet. Create one above.</p>
        ) : (
          <ul className="space-y-2">
            {projects.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="glass-card rounded-xl p-3 flex items-center justify-between hover:border-white/30 border border-white/10 transition-all">
                  <div><div className="font-medium text-white text-sm">{p.title}</div><div className="text-xs text-zinc-400">{Math.round(projectProgress(p.tasks) * 100)}% · {p.tasks.length} task(s) · {p._count.risks} risk(s)</div></div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-zinc-300">{p.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 mt-6 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Risk is heuristic decision-support only. No provider writes, no email, no silent actions.</p>
    </div>
  );
}
