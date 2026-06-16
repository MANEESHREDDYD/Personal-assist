"use client";

import { useState, useTransition } from "react";
import { Loader2, CalendarCheck, ShieldCheck, Clock } from "lucide-react";
import { getMeetingTypeSlots, submitBookingRequest } from "@/app/actions/booking";
import type { BookingAnswers } from "@/lib/booking/types";

interface QuestionView { label: string; type: string; required: boolean; options?: string[] }
interface MeetingTypeView {
  id: string; title: string; description?: string | null; durationMins: number;
  locationType: string; locationValue?: string | null; questions: QuestionView[];
}

export function BookingClient({ slug }: { slug: string }) {
  const [pending, startTransition] = useTransition();
  const [mt, setMt] = useState<MeetingTypeView | null>(null);
  const [timezone, setTimezone] = useState("UTC");
  const [slots, setSlots] = useState<{ start: string; end: string }[] | null>(null);
  const [selected, setSelected] = useState<{ start: string; end: string } | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<BookingAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const today = new Date();
  const inTwoWeeks = new Date(today.getTime() + 14 * 86400000);

  function loadSlots() {
    setError(null); setSlots(null); setSelected(null);
    startTransition(async () => {
      const res = await getMeetingTypeSlots({
        slug, rangeStart: today.toISOString(), rangeEnd: inTwoWeeks.toISOString(),
      });
      if (res.success) { setMt(res.meetingType as MeetingTypeView); setTimezone(res.timezone || "UTC"); setSlots(res.slots || []); }
      else setError(res.error || "Could not load availability.");
    });
  }

  function submit() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const res = await submitBookingRequest({
        slug, slotStart: selected.start, slotEnd: selected.end,
        invitee: { name, email: email || undefined }, answers,
      });
      if (res.success) setDone(true);
      else setError(res.error || "Submission failed");
    });
  }

  if (done) {
    return (
      <div className="glass-card rounded-2xl p-8 text-center">
        <CalendarCheck className="w-12 h-12 text-green-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Request submitted</h2>
        <p className="text-zinc-400 text-sm">
          Your booking request was recorded locally and is pending the organizer&apos;s approval.
          No confirmation email was sent automatically and no calendar event was created.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!slots && (
        <div className="glass-card rounded-2xl p-6">
          <p className="text-zinc-300 text-sm mb-4">Load availability for this meeting type to pick a time.</p>
          <button onClick={loadSlots} disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
            {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />} View available times
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{error}</p>}

      {mt && slots && (
        <>
          <div className="glass-card rounded-2xl p-5">
            <h2 className="text-lg font-bold text-white">{mt.title}</h2>
            {mt.description && <p className="text-sm text-zinc-400">{mt.description}</p>}
            <p className="text-xs text-zinc-500 mt-1">{mt.durationMins} min · {mt.locationValue || mt.locationType} · times shown in {timezone}</p>
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="font-bold text-white mb-3">Pick a time</h3>
            {slots.length === 0 ? (
              <p className="text-sm text-zinc-500">No available times in the next two weeks. The organizer may need to widen working hours.</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {slots.map((s) => {
                  const active = selected?.start === s.start;
                  return (
                    <button key={s.start} onClick={() => setSelected(s)} className={`px-3 py-2 rounded-lg text-sm border ${active ? "border-blue-500 bg-blue-500/15 text-white" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/30"}`}>
                      {new Date(s.start).toLocaleString(undefined, { timeZone: timezone, weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selected && (
            <div className="glass-card rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-white">Your details</h3>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name *" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
              {mt.questions.map((q) => (
                <div key={q.label}>
                  <label className="text-xs text-zinc-400">{q.label}{q.required ? " *" : ""}</label>
                  {q.type === "long_text" ? (
                    <textarea rows={3} onChange={(e) => setAnswers({ ...answers, [q.label]: e.target.value })} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                  ) : q.type === "select" ? (
                    <select onChange={(e) => setAnswers({ ...answers, [q.label]: e.target.value })} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">
                      <option value="">Select…</option>
                      {(q.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : q.type === "checkbox" ? (
                    <label className="flex items-center gap-2 mt-1 text-sm text-zinc-300"><input type="checkbox" onChange={(e) => setAnswers({ ...answers, [q.label]: e.target.checked })} /> Yes</label>
                  ) : (
                    <input type={q.type === "email" ? "email" : q.type === "phone" ? "tel" : "text"} onChange={(e) => setAnswers({ ...answers, [q.label]: e.target.value })} className="mt-1 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                  )}
                </div>
              ))}
              <button onClick={submit} disabled={pending || !name.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
                {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarCheck className="w-4 h-4" />} Request this time
              </button>
            </div>
          )}
        </>
      )}

      <p className="text-[11px] text-zinc-500 flex items-center gap-1">
        <ShieldCheck className="w-3 h-3" /> This is a local-first booking link. Submitting records a request for the organizer to approve — no email is sent and no calendar event is created automatically.
      </p>
    </div>
  );
}
