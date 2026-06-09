import { prisma } from "@/lib/prisma";
import { ListTodo, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { FollowUpClientActions } from "./FollowUpClientActions";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const followups = await prisma.followUp.findMany({
    orderBy: { createdAt: 'desc' }
  });

  const contacts = await prisma.contact.findMany();
  const contactMap = new Map(contacts.map(c => [c.id, c]));

  const mappedFollowups = followups.map(f => ({
    ...f,
    relatedContact: f.relatedContactId ? contactMap.get(f.relatedContactId) : null
  }));

  const pending = mappedFollowups.filter(f => f.status === "pending");
  const completed = mappedFollowups.filter(f => f.status === "completed" || f.status === "dismissed");

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <ListTodo className="text-teal-400" />
            Follow-Up Queue
          </h1>
          <p className="text-zinc-400">Keep track of items that need your attention or a gentle nudge.</p>
        </div>
        
        <Link href="/add?type=followup" className="px-4 py-2 bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 rounded-xl font-medium transition-colors">
          New Follow-Up
        </Link>
      </div>

      <div className="space-y-6">
        <h2 className="text-xl font-bold text-white">Pending Action</h2>
        {pending.length === 0 ? (
           <div className="glass-card p-6 rounded-xl text-center text-zinc-500">
             You have no pending follow-ups.
           </div>
        ) : (
          <div className="grid gap-4">
            {pending.map(f => (
              <div key={f.id} className="glass-card p-5 rounded-xl border-l-4 border-l-teal-500 flex justify-between items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-white text-lg">{f.title}</h3>
                    {f.priority === 'high' && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-[10px] uppercase font-bold rounded">High Priority</span>}
                  </div>
                  <p className="text-zinc-400 text-sm mb-2">{f.reason || "No reason provided."}</p>
                  <div className="flex gap-2 items-center text-xs text-zinc-500">
                    <span className="bg-white/10 px-2 py-1 rounded">Source: {f.source}</span>
                    {f.relatedContact && (
                       <Link href={`/contacts/${f.relatedContactId}`} className="text-blue-400 hover:underline">
                         👤 {f.relatedContact.name}
                       </Link>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex gap-2">
                  <FollowUpClientActions followup={f} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-6 pt-8 border-t border-white/10">
        <h2 className="text-xl font-bold text-white opacity-50">Completed</h2>
        <div className="grid gap-2">
          {completed.slice(0, 10).map(f => (
            <div key={f.id} className="p-3 bg-white/5 rounded-lg flex justify-between items-center opacity-50">
               <span className="text-zinc-300 line-through text-sm">{f.title}</span>
               <span className="text-xs text-zinc-500 uppercase font-bold">{f.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
