import Link from "next/link";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RunButton } from "@/app/optimizer/OptimizerClient";

export const dynamic = "force-dynamic";

function fmt(d: Date) { return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }); }

export default async function DayPlanPage() {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 86_400_000);
  const [tasks, focus, habits, holds] = await Promise.all([
    prisma.plannerTaskSchedule.findMany({ where: { start: { gte: start, lt: end } }, orderBy: { start: "asc" }, include: { task: true } }),
    prisma.focusBlock.findMany({ where: { start: { gte: start, lt: end } }, orderBy: { start: "asc" } }),
    prisma.habitSchedule.findMany({ where: { start: { gte: start, lt: end } }, orderBy: { start: "asc" }, include: { habit: true } }),
    prisma.calendarHold.findMany({ where: { status: { in: ["held", "promoted"] }, start: { gte: start, lt: end } }, orderBy: { start: "asc" } }),
  ]);
  type Row = { start: Date; end: Date; label: string; kind: string };
  const rows: Row[] = [
    ...tasks.map((t) => ({ start: t.start, end: t.end, label: t.task.title, kind: "Task" })),
    ...focus.map((f) => ({ start: f.start, end: f.end, label: f.title, kind: "Focus" })),
    ...habits.map((h) => ({ start: h.start, end: h.end, label: h.habit.name, kind: "Habit" })),
    ...holds.map((h) => ({ start: h.start, end: h.end, label: h.title, kind: "Hold" })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  return (
    <div className="p-8 max-w-2xl mx-auto w-full">
      <Link href="/planner" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-4"><ArrowLeft className="w-4 h-4" /> Planner</Link>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2"><CalendarDays className="text-blue-400" /> Today&apos;s plan</h1>
        <RunButton scope="day" />
      </div>
      {rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center"><p className="text-zinc-400">Nothing scheduled today yet. Click <strong>Run day optimization</strong>, then approve proposals to fill your day.</p></div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r, i) => (
            <li key={i} className="glass-card rounded-xl p-3 flex items-center justify-between text-sm">
              <span className="text-zinc-200">{fmt(r.start)}–{fmt(r.end)} · {r.label}</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-zinc-300">{r.kind}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
