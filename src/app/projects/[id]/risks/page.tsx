import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProjectNav } from "../ProjectNav";
import { ScoreRisksButton } from "../ProjectClients";

export const dynamic = "force-dynamic";

const LEVEL_COLOR: Record<string, string> = { low: "text-zinc-400", medium: "text-yellow-400", high: "text-orange-400", critical: "text-red-400" };

export default async function ProjectRisks({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { risks: { where: { resolved: false }, orderBy: { createdAt: "desc" } } } });
  if (!project) notFound();
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{project.title} — Risks</h1>
      <ProjectNav id={id} active="Risks" />
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <p className="text-sm text-zinc-400">Heuristic risk findings — decision support only, not advice.</p>
        <ScoreRisksButton projectId={id} />
      </div>
      {project.risks.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center"><p className="text-zinc-400">No risks flagged. Click <strong>Re-score risks</strong> to evaluate deadlines, blocked tasks, owners, and scheduled coverage.</p></div>
      ) : (
        <ul className="space-y-2">
          {project.risks.map((r) => (
            <li key={r.id} className="glass-card rounded-lg p-3 flex items-start gap-2 text-sm">
              <AlertTriangle className={`w-4 h-4 mt-0.5 ${LEVEL_COLOR[r.level] || "text-zinc-400"}`} />
              <div>
                <span className={`text-[10px] uppercase tracking-wider font-bold ${LEVEL_COLOR[r.level]}`}>{r.level}</span>
                <span className="text-zinc-500 text-[10px] ml-2">{r.kind.replace(/_/g, " ")}</span>
                <p className="text-zinc-200">{r.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
