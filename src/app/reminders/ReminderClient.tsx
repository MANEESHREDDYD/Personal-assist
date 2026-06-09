"use client";

import { useState } from "react";
import { updateReminderStatus, snoozeReminder } from "../actions/reminders";
import { Bell, Check, Clock, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export function ReminderClient({ reminders }: { reminders: any[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleStatus(id: string, status: string) {
    setLoadingId(id);
    await updateReminderStatus(id, status);
    setLoadingId(null);
  }

  async function handleSnooze(id: string) {
    setLoadingId(id);
    await snoozeReminder(id);
    setLoadingId(null);
  }

  const pending = reminders.filter(r => r.status === "pending" || r.status === "missed");
  const other = reminders.filter(r => r.status === "completed" || r.status === "snoozed");

  const today = new Date();
  
  return (
    <div className="p-8 max-w-4xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Bell className="text-yellow-400" />
            Reminders
          </h1>
          <p className="text-zinc-400">Manage your local reminders and due dates.</p>
        </div>
        <Link href="/add?type=reminder" className="px-4 py-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 rounded-xl font-medium transition-colors">
          Add Reminder
        </Link>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Pending</h2>
        {pending.length === 0 ? (
          <p className="text-zinc-500">No pending reminders.</p>
        ) : (
          pending.map(r => {
            const isOverdue = r.dueDate && new Date(r.dueDate) < today && r.status !== 'completed';
            return (
              <div key={r.id} className={`glass-card p-4 rounded-xl flex items-center justify-between border-l-4 ${isOverdue ? 'border-l-red-500' : 'border-l-yellow-500'}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg">{r.title}</h3>
                    {r.priority === 'high' && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] uppercase font-bold rounded">High Priority</span>}
                    {isOverdue && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] uppercase font-bold rounded flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Overdue</span>}
                  </div>
                  {r.description && <p className="text-zinc-400 text-sm mt-1">{r.description}</p>}
                  {r.dueDate && <p className="text-zinc-500 text-xs mt-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Due: {new Date(r.dueDate).toLocaleString()}</p>}
                </div>
                
                <div className="flex gap-2 shrink-0 ml-4">
                  <button 
                    onClick={() => handleSnooze(r.id)}
                    disabled={loadingId === r.id}
                    className="p-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleStatus(r.id, "completed")}
                    disabled={loadingId === r.id}
                    className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                  >
                    {loadingId === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="space-y-4 pt-8">
        <h2 className="text-xl font-bold text-white opacity-50">Completed & Snoozed</h2>
        {other.length === 0 ? (
          <p className="text-zinc-500">Nothing here yet.</p>
        ) : (
          other.map(r => (
             <div key={r.id} className={`glass-card p-4 rounded-xl flex items-center justify-between opacity-50`}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-lg line-through">{r.title}</h3>
                    <span className="px-2 py-0.5 bg-white/10 text-white/50 text-[10px] uppercase font-bold rounded">{r.status}</span>
                  </div>
                </div>
             </div>
          ))
        )}
      </div>
    </div>
  );
}
