import Link from "next/link";
import { Clock } from "lucide-react";
import { getWorkingHours } from "@/app/actions/scheduling";
import { WorkingHoursClient } from "./WorkingHoursClient";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const wh = await getWorkingHours();
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Clock className="text-blue-400" /> Availability
        </h1>
        <p className="text-zinc-400">
          Set timezone-aware working hours. These drive the availability engine for booking,
          scheduling, and the planner. Manage break / do-not-schedule windows in{" "}
          <Link href="/availability/rules" className="text-blue-400 hover:underline">Availability Rules</Link>.
        </p>
      </div>
      <WorkingHoursClient initial={{ timezone: wh.timezone, days: wh.days }} />
    </div>
  );
}
