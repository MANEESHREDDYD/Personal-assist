import { notFound } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BookingClient } from "./BookingClient";

export const dynamic = "force-dynamic";

export default async function PublicBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mt = await prisma.meetingType.findUnique({ where: { slug } });
  if (!mt) notFound();

  return (
    <div className="p-8 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-2">
          <CalendarClock className="text-blue-400" /> Book a time
        </h1>
        <p className="text-zinc-400 text-sm">
          {mt.active ? "Choose a time that works for you." : "This meeting type is currently inactive."}
        </p>
      </div>
      {mt.active ? (
        <BookingClient slug={slug} />
      ) : (
        <div className="glass-card rounded-2xl p-8 text-center text-zinc-400">This booking link is not currently active.</div>
      )}
      <p className="text-[11px] text-zinc-600 mt-6">
        Local-only link. When running on <code>localhost</code> this page is reachable only on this device; deploy the app to share it externally.
      </p>
    </div>
  );
}
