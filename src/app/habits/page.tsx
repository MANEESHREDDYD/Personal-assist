import { Repeat } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { HabitsClient } from "./HabitsClient";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const habits = await prisma.habit.findMany({ where: { active: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><Repeat className="text-blue-400" /> Habits</h1>
        <p className="text-zinc-400">Recurring habits the optimizer schedules into your preferred windows.</p>
      </div>
      <HabitsClient habits={habits.map((h) => ({ id: h.id, name: h.name, frequency: h.frequency, durationMins: h.durationMins, windowStartMin: h.windowStartMin, windowEndMin: h.windowEndMin }))} />
    </div>
  );
}
