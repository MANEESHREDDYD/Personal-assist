import Link from "next/link";
import { CalendarRange, ListChecks, Repeat, Brain, Wand2, CalendarDays, BarChart3, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default function PlannerHub() {
  const tiles = [
    { href: "/planner/day", title: "Day plan", desc: "Today's schedule", icon: CalendarDays },
    { href: "/planner/week", title: "Week plan", desc: "Next 7 days", icon: CalendarRange },
    { href: "/tasks", title: "Tasks", desc: "Priorities, due dates, estimates", icon: ListChecks },
    { href: "/habits", title: "Habits", desc: "Recurring routines", icon: Repeat },
    { href: "/focus", title: "Focus policy", desc: "Weekly focus goal + deep work", icon: Brain },
    { href: "/optimizer", title: "Optimizer", desc: "Schedule + protect focus", icon: Wand2 },
    { href: "/weekly-review", title: "Weekly review", desc: "Load, focus coverage, risk", icon: BarChart3 },
  ];
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><CalendarRange className="text-blue-400" /> Smart Planner</h1>
        <p className="text-zinc-400">A local Motion/Reclaim/Clockwise-style planner: schedule tasks into open time, protect focus, and optimize your week — all approval-gated, nothing sent or written externally.</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="glass-card rounded-xl p-4 hover:border-white/30 border border-white/10 transition-all">
            <t.icon className="w-5 h-5 text-blue-400 mb-1" />
            <div className="font-semibold text-white text-sm">{t.title}</div>
            <p className="text-xs text-zinc-400">{t.desc}</p>
          </Link>
        ))}
      </div>
      <p className="text-[11px] text-zinc-500 mt-6 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> No provider calendar writes, no silent meeting moves, no email sending.</p>
    </div>
  );
}
