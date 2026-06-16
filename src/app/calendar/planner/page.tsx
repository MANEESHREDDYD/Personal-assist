import Link from "next/link";
import { CalendarRange, Sparkles, Lock, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { meetingLoadHours, type Interval } from "@/lib/scheduling/engine";

export const dynamic = "force-dynamic";

function fmt(d: Date) {
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function PlannerPage() {
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 86400000);

  const [slots, holds, blocks] = await Promise.all([
    prisma.suggestedSlot.findMany({ where: { consumed: false, start: { gte: now } }, orderBy: { score: "desc" }, take: 12 }),
    prisma.calendarHold.findMany({ where: { status: { in: ["held", "promoted"] }, start: { gte: now, lt: weekEnd } }, orderBy: { start: "asc" } }),
    prisma.timeBlock.findMany({ where: { start: { gte: now, lt: weekEnd } }, orderBy: { start: "asc" } }),
  ]);

  const busy: Interval[] = [
    ...holds.map((h) => ({ start: h.start.getTime(), end: h.end.getTime() })),
    ...blocks.filter((b) => b.kind === "meeting").map((b) => ({ start: b.start.getTime(), end: b.end.getTime() })),
  ];
  const loadHrs = meetingLoadHours(busy, { start: now.getTime(), end: weekEnd.getTime() });
  const focusHrs = meetingLoadHours(
    blocks.filter((b) => b.kind === "focus").map((b) => ({ start: b.start.getTime(), end: b.end.getTime() })),
    { start: now.getTime(), end: weekEnd.getTime() }
  );

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <CalendarRange className="text-blue-400" /> Calendar Planner
        </h1>
        <p className="text-zinc-400">
          A local view of your next 7 days: suggested slots, calendar holds, and time blocks.
          Generate slots in <Link href="/scheduling" className="text-blue-400 hover:underline">Scheduling</Link>;
          review write requests in <Link href="/calendar/write-requests" className="text-blue-400 hover:underline">Write Requests</Link>.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 mb-6">
        <Stat label="Meeting load (7d)" value={`${loadHrs.toFixed(1)} h`} />
        <Stat label="Planned focus (7d)" value={`${focusHrs.toFixed(1)} h`} />
        <Stat label="Active holds" value={String(holds.length)} />
      </div>

      <Panel title="Suggested slots" icon={<Sparkles className="w-4 h-4 text-purple-400" />}>
        {slots.length === 0 ? (
          <Empty text="No suggested slots yet. Run a preview in Scheduling to populate them." />
        ) : (
          <ul className="space-y-1.5 text-sm">
            {slots.map((s) => (
              <li key={s.id} className="flex justify-between text-zinc-300 bg-black/20 rounded px-3 py-1.5">
                <span>{fmt(s.start)} → {s.end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                <span className="text-[10px] text-zinc-500">{s.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Calendar holds" icon={<Lock className="w-4 h-4 text-amber-400" />}>
        {holds.length === 0 ? (
          <Empty text="No active holds. Approve + execute a calendar write request to create a local hold." />
        ) : (
          <ul className="space-y-1.5 text-sm">
            {holds.map((h) => (
              <li key={h.id} className="flex justify-between text-zinc-300 bg-black/20 rounded px-3 py-1.5">
                <span>{h.title}</span>
                <span className="text-[10px] text-zinc-500">{fmt(h.start)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Time blocks" icon={<CalendarClock className="w-4 h-4 text-blue-400" />}>
        {blocks.length === 0 ? (
          <Empty text="No time blocks in the next 7 days." />
        ) : (
          <ul className="space-y-1.5 text-sm">
            {blocks.map((b) => (
              <li key={b.id} className="flex justify-between text-zinc-300 bg-black/20 rounded px-3 py-1.5">
                <span>{b.title} <span className="text-[10px] text-zinc-500 ml-1">{b.kind}</span></span>
                <span className="text-[10px] text-zinc-500">{fmt(b.start)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-4 text-center">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-5 mb-4">
      <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">{icon} {title}</h2>
      {children}
    </section>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="text-sm text-zinc-500">{text}</p>;
}
