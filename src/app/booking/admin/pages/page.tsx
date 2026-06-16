import Link from "next/link";
import { LayoutTemplate } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PagesClient } from "./PagesClient";

export const dynamic = "force-dynamic";

export default async function BookingPagesAdmin() {
  const pages = await prisma.bookingPage.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <LayoutTemplate className="text-blue-400" /> Booking Pages
        </h1>
        <p className="text-zinc-400">
          Create branded booking pages. Back to <Link href="/booking/admin" className="text-blue-400 hover:underline">Booking admin</Link>.
        </p>
      </div>
      <PagesClient />
      <div className="mt-6">
        {pages.length === 0 ? (
          <p className="text-sm text-zinc-500">No booking pages yet.</p>
        ) : (
          <ul className="space-y-2">
            {pages.map((p) => (
              <li key={p.id} className="glass-card rounded-lg p-3 flex items-center justify-between text-sm">
                <span className="text-zinc-200"><strong className="text-white">{p.title}</strong> · {p.timezone}{p.ownerName ? ` · ${p.ownerName}` : ""}</span>
                <span className="text-xs text-zinc-500">/booking page slug: {p.slug}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
