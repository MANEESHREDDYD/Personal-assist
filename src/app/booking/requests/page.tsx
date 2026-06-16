import Link from "next/link";
import { Inbox, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { RequestActions } from "./RequestActions";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function BookingRequestsPage() {
  const requests = await prisma.bookingRequest.findMany({
    orderBy: { createdAt: "desc" }, take: 50,
    include: { meetingType: true, invitees: { where: { isPrimary: true }, take: 1 } },
  });

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Inbox className="text-blue-400" /> Booking Requests
        </h1>
        <p className="text-zinc-400">
          Review incoming requests. Approving creates an approval-gated calendar write request and a
          local confirmation draft — <strong className="text-white">nothing is sent</strong> and no
          provider event is written. Admin: <Link href="/booking/admin" className="text-blue-400 hover:underline">meeting types &amp; pages</Link>.
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center">
          <p className="text-zinc-400">No booking requests yet. Share a meeting type link (e.g. <code className="text-blue-300">/booking/intro-call</code>) and submit one to test the flow.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => (
            <li key={r.id} className="glass-card rounded-xl p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <Link href={`/booking/requests/${r.id}`} className="font-semibold text-white hover:underline">{r.meetingType.title}</Link>
                  <div className="text-xs text-zinc-400">{r.invitees[0]?.name ?? "Invitee"} · {fmt(r.slotStart)} · {r.timezone}{r.routedTo ? ` · routed → ${r.routedTo}` : ""}</div>
                </div>
                <RequestActions id={r.id} status={r.status} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-zinc-500 mt-6 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> No automatic confirmations, no provider calendar writes, no attendee notifications.
      </p>
    </div>
  );
}
