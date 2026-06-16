import Link from "next/link";
import { CalendarClock, Settings, Inbox, ExternalLink, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function BookingHome() {
  const [activeTypes, pendingCount] = await Promise.all([
    prisma.meetingType.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.bookingRequest.count({ where: { status: "pending" } }),
  ]);

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <CalendarClock className="text-blue-400" /> Booking
        </h1>
        <p className="text-zinc-400">
          Calendly-style booking links, powered by your local availability engine. Share a meeting
          type link; requests land in your queue for approval — no auto-confirmations, no provider
          writes.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Link href="/booking/admin/meeting-types" className="glass-card rounded-xl p-4 hover:border-white/30 border border-white/10 transition-all">
          <Settings className="w-5 h-5 text-blue-400 mb-1" />
          <div className="font-semibold text-white text-sm">Meeting types</div>
          <p className="text-xs text-zinc-400">Create bookable types &amp; links</p>
        </Link>
        <Link href="/booking/admin/pages" className="glass-card rounded-xl p-4 hover:border-white/30 border border-white/10 transition-all">
          <CalendarClock className="w-5 h-5 text-blue-400 mb-1" />
          <div className="font-semibold text-white text-sm">Booking pages</div>
          <p className="text-xs text-zinc-400">Branded scheduling pages</p>
        </Link>
        <Link href="/booking/requests" className="glass-card rounded-xl p-4 hover:border-white/30 border border-white/10 transition-all">
          <Inbox className="w-5 h-5 text-blue-400 mb-1" />
          <div className="font-semibold text-white text-sm">Requests {pendingCount > 0 && <span className="text-amber-400">({pendingCount})</span>}</div>
          <p className="text-xs text-zinc-400">Approve / reject bookings</p>
        </Link>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h2 className="font-bold text-white mb-3">Active meeting links</h2>
        {activeTypes.length === 0 ? (
          <p className="text-sm text-zinc-500">No active meeting types yet. <Link href="/booking/admin/meeting-types" className="text-blue-400 hover:underline">Create one</Link> to get a booking link.</p>
        ) : (
          <ul className="space-y-2">
            {activeTypes.map((mt) => (
              <li key={mt.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-200">{mt.title} <span className="text-zinc-500">· {mt.durationMins} min</span></span>
                <Link href={`/booking/${mt.slug}`} className="text-blue-400 hover:underline flex items-center gap-1 text-xs"><ExternalLink className="w-3 h-3" /> /booking/{mt.slug}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-zinc-500 mt-6 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> Local-first: booking links are local-only on localhost until deployed. Approval creates an approval-gated calendar write request; nothing is sent or written externally.
      </p>
    </div>
  );
}
