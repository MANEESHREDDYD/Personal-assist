import { prisma } from "@/lib/prisma";
import { LayoutDashboard } from "lucide-react";
import { DashboardBriefGenerator } from "./DashboardClientComponents";
import { WalletCardItem } from "@/components/wallet/WalletCardItem";

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Home() {
  const onboarding = await prisma.userPreference.findUnique({ where: { key: "onboardingCompleted" } });
  if (onboarding?.value !== "true") {
    redirect("/onboarding");
  }

  const latestCards = await prisma.walletCard.findMany({
    orderBy: { createdAt: "desc" },
    take: 4,
  });

  const briefs = await prisma.brief.findMany({
    where: { type: { in: ["daily_start", "daily_end"] } },
    orderBy: { createdAt: "desc" },
    take: 2,
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <LayoutDashboard className="text-blue-400 w-8 h-8" />
          Command Center
        </h1>
        <p className="text-zinc-400 text-lg">Your daily operations overview.</p>
      </div>

      <DashboardBriefGenerator />

      {briefs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {briefs.map((brief) => {
            const content = JSON.parse(brief.content);
            const isStart = brief.type === "daily_start";
            return (
              <div key={brief.id} className={`glass-card rounded-3xl p-8 border-t-4 ${isStart ? "border-t-blue-500" : "border-t-indigo-500"}`}>
                <h3 className="text-2xl font-bold text-white mb-6">
                  {isStart ? "Daily Life Brief" : "End-of-Day Brief"}
                </h3>
                <div className="space-y-4">
                  {Object.entries(content).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1">
                      <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className="text-zinc-300">{value as string}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-white">Recent Activity</h2>
          <a href="/wallet" className="text-sm text-blue-400 hover:text-blue-300">View All</a>
        </div>
        
        {latestCards.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-zinc-400">
            No activity yet. Start by adding items to your wallet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {latestCards.map(card => (
              <WalletCardItem key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
