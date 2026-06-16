"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Loader2 } from "lucide-react";
import { generateWeeklyReview } from "@/app/actions/planner";

export function GenerateReview() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button onClick={() => startTransition(async () => { const r = await generateWeeklyReview(); if (!r.success && r.error) alert(r.error); router.refresh(); })} disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />} Generate weekly review
    </button>
  );
}
