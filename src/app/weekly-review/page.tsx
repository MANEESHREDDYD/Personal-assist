import { BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { GenerateReview } from "./WeeklyReviewClient";

export const dynamic = "force-dynamic";

export default async function WeeklyReviewPage() {
  const reviews = await prisma.weeklyReview.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2"><BarChart3 className="text-blue-400" /> Weekly Review</h1>
        <GenerateReview />
      </div>
      {reviews.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center"><p className="text-zinc-400">No reviews yet. Generate one to see meeting load, focus coverage, fragmented days, and workload risk.</p></div>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => {
            const m = r.metricsJson ? JSON.parse(r.metricsJson) : null;
            return (
              <li key={r.id} className="glass-card rounded-xl p-4">
                <div className="text-xs text-zinc-500 mb-1">{r.createdAt.toLocaleString()}</div>
                <p className="text-sm text-zinc-200">{r.summary}</p>
                {m && (
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <Mini label="Focus coverage" value={`${m.focusCoveragePct ?? 0}%`} />
                    <Mini label="Fragmented days" value={`${m.fragmentedDays ?? 0}`} />
                    <Mini label="Burnout risk" value={`${Math.round((m.burnoutRisk ?? 0) * 100)}%`} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return <div className="bg-black/20 rounded-lg p-2"><p className="text-[10px] text-zinc-500">{label}</p><p className="text-base font-bold text-white">{value}</p></div>;
}
