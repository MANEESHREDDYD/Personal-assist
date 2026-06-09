import { prisma } from "@/lib/prisma";
import { Mail, Edit, Check, Copy, Archive } from "lucide-react";
import Link from "next/link";
import { DraftClientActions } from "./DraftClientActions";

export const dynamic = "force-dynamic";

export default async function DraftsPage({ searchParams }: { searchParams: { sourceId?: string, type?: string, to?: string } }) {
  const drafts = await prisma.emailDraft.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <Mail className="text-blue-400" />
            Email Drafts Workspace
          </h1>
          <p className="text-zinc-400">Manage offline email drafts locally without sending them.</p>
        </div>
        
        {/* Placeholder for creating a new blank draft */}
        <Link href="/add?type=draft" className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl font-medium transition-colors">
          New Blank Draft
        </Link>
      </div>

      <div className="space-y-6">
        {drafts.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <p className="text-zinc-500">No email drafts found. Generate one from a Document, Calendar Event, or Inbox Item.</p>
          </div>
        ) : (
          drafts.map(draft => (
            <div key={draft.id} className="glass-card rounded-2xl p-6 border-l-4 border-l-blue-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">{draft.subject || "(No Subject)"}</h3>
                  <p className="text-sm text-zinc-400">To: {draft.to || "Unknown"}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  draft.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  draft.status === 'archived' ? 'bg-zinc-500/20 text-zinc-400' :
                  'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {draft.status.replace("_", " ")}
                </span>
              </div>
              
              <div className="bg-black/20 p-4 rounded-xl text-zinc-300 text-sm whitespace-pre-wrap mb-4 border border-white/5">
                {draft.body || "(Empty Body)"}
              </div>

              <div className="flex gap-2 border-t border-white/10 pt-4">
                <DraftClientActions draft={draft} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
