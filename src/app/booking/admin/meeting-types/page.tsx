import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { MeetingTypesClient } from "./MeetingTypesClient";

export const dynamic = "force-dynamic";

export default async function MeetingTypesPage() {
  const mts = await prisma.meetingType.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true, routingRules: true } } },
  });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <CalendarPlus className="text-blue-400" /> Meeting Types
        </h1>
        <p className="text-zinc-400">
          Define bookable meeting types with duration, location, questions, and routing. Each gets a
          local booking link at <code className="text-blue-300">/booking/[slug]</code>. Back to{" "}
          <Link href="/booking/admin" className="text-blue-400 hover:underline">Booking admin</Link>.
        </p>
      </div>
      <MeetingTypesClient
        meetingTypes={mts.map((m) => ({
          id: m.id, title: m.title, slug: m.slug, durationMins: m.durationMins,
          locationType: m.locationType, active: m.active,
          questionCount: m._count.questions, routingCount: m._count.routingRules,
        }))}
      />
    </div>
  );
}
