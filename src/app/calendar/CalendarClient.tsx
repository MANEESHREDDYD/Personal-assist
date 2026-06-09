"use client";

import { useState } from "react";
import { importICS } from "../actions/calendar";
import { Calendar, Upload, Loader2, Clock, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

export function CalendarClient({ events }: { events: any[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = events.filter(e => e.startDate && new Date(e.startDate) >= today);
  const missed = events.filter(e => e.startDate && new Date(e.startDate) < today);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setStatus("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await importICS(formData);
    if (res.success) {
      setStatus(`Successfully imported ${res.count} new events.`);
    } else {
      setError(res.error || "Failed to import");
    }
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Calendar className="text-purple-400" />
            Local Calendar
          </h1>
          <p className="text-zinc-400">View and import offline .ics calendar events.</p>
        </div>
        
        <label className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 cursor-pointer transition-colors text-white text-sm font-medium">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Import .ics File
          <input type="file" accept=".ics" className="hidden" onChange={handleUpload} disabled={loading} />
        </label>
      </div>

      {status && <div className="p-4 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20">{status}</div>}
      {error && <div className="p-4 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="text-blue-400" /> Upcoming Events
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-zinc-500">No upcoming events found.</p>
          ) : (
            upcoming.map(ev => (
              <EventCard key={ev.id} event={ev} />
            ))
          )}
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="text-yellow-400" /> Past / Missed Events
          </h2>
          {missed.length === 0 ? (
            <p className="text-zinc-500">No past events found.</p>
          ) : (
            missed.slice(0, 5).map(ev => (
              <EventCard key={ev.id} event={ev} past />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, past = false }: { event: any, past?: boolean }) {
  const startDate = new Date(event.startDate).toLocaleString();
  
  return (
    <div className={`glass-card p-5 rounded-2xl border-l-4 ${past ? 'border-l-zinc-600 opacity-70' : 'border-l-purple-500'}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg text-white">{event.title}</h3>
        <span className="text-xs bg-white/10 px-2 py-1 rounded text-zinc-300">{event.source}</span>
      </div>
      <p className="text-sm text-zinc-400 mb-1">{startDate}</p>
      {event.location && <p className="text-xs text-zinc-500 mb-4 flex items-center gap-1">📍 {event.location}</p>}
      
      <div className="flex gap-2 flex-wrap mt-4 pt-4 border-t border-white/5">
        <Link href={`/drafts?sourceId=${event.id}&type=follow_up`} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors">
          Draft Follow-Up Email
        </Link>
        <Link href={`/followups`} className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition-colors">
          Create Follow-Up Queue
        </Link>
      </div>
    </div>
  );
}
