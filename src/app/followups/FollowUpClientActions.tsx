"use client";

import { useState } from "react";
import { updateFollowUpStatus } from "../actions/followups";
import { Check, X, Loader2, Mail } from "lucide-react";
import Link from "next/link";

export function FollowUpClientActions({ followup }: { followup: any }) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleStatus(status: string) {
    setLoading(status);
    await updateFollowUpStatus(followup.id, status);
    setLoading(null);
  }

  return (
    <>
      <Link 
        href={`/drafts?sourceId=${followup.id}&type=follow_up&to=${followup.relatedContact?.email || ''}`}
        className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
      >
        <Mail className="w-3.5 h-3.5" />
        Draft Email
      </Link>
      
      <button 
        onClick={() => handleStatus("completed")}
        disabled={loading !== null}
        className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
        title="Mark Done"
      >
        {loading === "completed" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
      </button>

      <button 
        onClick={() => handleStatus("dismissed")}
        disabled={loading !== null}
        className="px-3 py-1.5 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
        title="Dismiss"
      >
        {loading === "dismissed" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
      </button>
    </>
  );
}
