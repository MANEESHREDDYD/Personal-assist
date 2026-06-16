import { CalendarClock } from "lucide-react";
import { getSchedulingPreferences } from "@/app/actions/scheduling";
import { SchedulingClient } from "./SchedulingClient";

export const dynamic = "force-dynamic";

export default async function SchedulingPage() {
  const prefs = await getSchedulingPreferences();
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <CalendarClock className="text-blue-400" /> Scheduling
        </h1>
        <p className="text-zinc-400">
          Tune scheduling preferences, find free times from your working hours, and propose
          approval-gated calendar holds. Local-first — nothing is sent or written externally.
        </p>
      </div>
      <SchedulingClient
        initial={{
          bufferBeforeMins: prefs.bufferBeforeMins,
          bufferAfterMins: prefs.bufferAfterMins,
          maxMeetingsPerDay: prefs.maxMeetingsPerDay,
          maxMeetingHoursDay: prefs.maxMeetingHoursDay,
          minNoticeMins: prefs.minNoticeMins,
          lunchStartMinute: prefs.lunchStartMinute ?? null,
          lunchEndMinute: prefs.lunchEndMinute ?? null,
          slotGranularityMins: prefs.slotGranularityMins,
        }}
      />
    </div>
  );
}
