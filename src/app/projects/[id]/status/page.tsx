import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProjectNav } from "../ProjectNav";
import { StatusGenerator } from "../ProjectClients";

export const dynamic = "force-dynamic";

export default async function ProjectStatus({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { statusUpdates: { orderBy: { createdAt: "desc" }, take: 10 } } });
  if (!project) notFound();
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{project.title} — Status</h1>
      <ProjectNav id={id} active="Status" />
      <p className="text-sm text-zinc-400 mb-3">Generate local markdown drafts — brief, weekly status, blockers, decision memo, stakeholder update, next actions. Nothing is sent.</p>
      <StatusGenerator projectId={id} />
      <div className="mt-5 space-y-3">
        {project.statusUpdates.length === 0 ? <p className="text-sm text-zinc-500">No updates yet. Generate one above.</p> : project.statusUpdates.map((u) => (
          <div key={u.id} className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-1"><span className="text-xs text-zinc-500 uppercase tracking-wider">{u.kind.replace(/_/g, " ")}</span><span className="text-[10px] text-zinc-600">{u.createdAt.toLocaleString()}</span></div>
            <pre className="whitespace-pre-wrap text-xs text-zinc-300">{u.body}</pre>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500 mt-4 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Local drafts only — not sent. No financial/legal/medical advice.</p>
    </div>
  );
}
