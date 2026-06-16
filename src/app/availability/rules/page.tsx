import Link from "next/link";
import { CalendarOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RulesClient } from "./RulesClient";

export const dynamic = "force-dynamic";

export default async function AvailabilityRulesPage() {
  const rules = await prisma.availabilityRule.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <CalendarOff className="text-blue-400" /> Availability Rules
        </h1>
        <p className="text-zinc-400">
          Protect breaks and block do-not-schedule windows. These are treated as busy by the
          availability engine. Back to <Link href="/availability" className="text-blue-400 hover:underline">working hours</Link>.
        </p>
      </div>
      <RulesClient rules={rules.map((r) => ({ id: r.id, label: r.label, kind: r.kind, dayOfWeek: r.dayOfWeek, startMinute: r.startMinute, endMinute: r.endMinute }))} />
    </div>
  );
}
