import { Brain } from "lucide-react";
import { getPlannerPreference } from "@/app/actions/planner";
import { FocusClient } from "./FocusClient";

export const dynamic = "force-dynamic";

export default async function FocusPage() {
  const p = await getPlannerPreference();
  return (
    <div className="p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><Brain className="text-blue-400" /> Focus Policy</h1>
        <p className="text-zinc-400">Set your weekly focus goal and deep-work preferences. The optimizer proposes focus blocks to protect this time.</p>
      </div>
      <FocusClient initial={{ weeklyFocusGoalHrs: p.weeklyFocusGoalHrs, minFocusBlockMins: p.minFocusBlockMins, preferFocusMornings: p.preferFocusMornings, maxMeetingHoursDay: p.maxMeetingHoursDay }} />
    </div>
  );
}
