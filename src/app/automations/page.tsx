import { prisma } from "@/lib/prisma";
import { Zap } from "lucide-react";
import { AutomationsClient } from "./AutomationsClient";

export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const rules = await prisma.automationRule.findMany({
    orderBy: { createdAt: "asc" }
  });

  const recentRuns = await prisma.automationRun.findMany({
    take: 20,
    orderBy: { startedAt: "desc" },
    include: { rule: true }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <Zap className="text-yellow-400" />
          Local Automation Engine
        </h1>
        <p className="text-zinc-400 max-w-2xl">
          Configure local rules to automatically generate briefs, follow up with signers, and track due dates. All automations run securely on your machine. No external APIs.
        </p>
      </div>

      <AutomationsClient rules={rules} recentRuns={recentRuns} />
    </div>
  );
}
