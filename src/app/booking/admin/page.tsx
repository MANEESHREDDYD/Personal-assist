import Link from "next/link";
import { Settings, CalendarPlus, LayoutTemplate, Inbox } from "lucide-react";

export const dynamic = "force-dynamic";

export default function BookingAdmin() {
  const tiles = [
    { href: "/booking/admin/meeting-types", title: "Meeting types", desc: "Create bookable types, questions, routing", icon: CalendarPlus },
    { href: "/booking/admin/pages", title: "Booking pages", desc: "Branded scheduling pages", icon: LayoutTemplate },
    { href: "/booking/requests", title: "Requests", desc: "Approve / reject incoming bookings", icon: Inbox },
  ];
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="text-blue-400" /> Booking Admin
        </h1>
        <p className="text-zinc-400">Manage your booking system. Back to <Link href="/booking" className="text-blue-400 hover:underline">Booking home</Link>.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="glass-card rounded-xl p-4 hover:border-white/30 border border-white/10 transition-all">
            <t.icon className="w-5 h-5 text-blue-400 mb-1" />
            <div className="font-semibold text-white text-sm">{t.title}</div>
            <p className="text-xs text-zinc-400">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
