import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectNav } from "../ProjectNav";
import { ForecastButton } from "../ProjectClients";

export const dynamic = "force-dynamic";

const RISK_COLOR: Record<string, string> = { low: "text-zinc-300", medium: "text-yellow-400", high: "text-red-400" };

export default async function ProjectWorkload({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { forecasts: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!project) notFound();
  const f = project.forecasts[0];

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{project.title} — Workload</h1>
      <ProjectNav id={id} active="Workload" />
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <p className="text-sm text-zinc-400">Forecast estimated vs scheduled hours and delay risk from your tasks + planner.</p>
        <ForecastButton projectId={id} />
      </div>
      {!f ? (
        <div className="glass-card rounded-2xl p-10 text-center"><p className="text-zinc-400">No forecast yet. Click <strong>Run forecast</strong>.</p></div>
      ) : (
        <div className="grid sm:grid-cols-4 gap-2">
          <Stat label="Total estimate" value={`${f.totalEstimateHrs} h`} />
          <Stat label="Scheduled" value={`${f.scheduledHrs} h`} />
          <Stat label="Unscheduled" value={`${f.unscheduledHrs} h`} />
          <Stat label="Delay risk" value={f.delayRisk} cls={RISK_COLOR[f.delayRisk]} />
        </div>
      )}
      {f && <p className="text-[11px] text-zinc-500 mt-3">Generated {f.createdAt.toLocaleString()}. Send tasks to the planner (Tasks tab) and run the Optimizer to raise scheduled coverage.</p>}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return <div className="glass-card rounded-xl p-3 text-center"><p className="text-[11px] text-zinc-500">{label}</p><p className={`text-xl font-bold ${cls || "text-white"}`}>{value}</p></div>;
}
