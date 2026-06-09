"use client";

import { useState } from "react";
import { updateDraftStatus } from "../actions/drafts";
import { Check, Copy, Archive, Loader2 } from "lucide-react";

export function DraftClientActions({ draft }: { draft: any }) {
  const [loading, setLoading] = useState(false);

  async function handleStatus(newStatus: string) {
    setLoading(true);
    await updateDraftStatus(draft.id, newStatus);
    setLoading(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(`To: ${draft.to || ''}\nSubject: ${draft.subject || ''}\n\n${draft.body || ''}`);
    handleStatus("copied");
  }

  return (
    <>
      <button 
        onClick={() => handleStatus("approved")}
        disabled={loading || draft.status === "approved" || draft.status === "copied"}
        className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        Approve Locally
      </button>

      <button 
        onClick={handleCopy}
        disabled={loading}
        className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        <Copy className="w-3 h-3" />
        Copy to Clipboard
      </button>

      <button 
        onClick={() => handleStatus("archived")}
        disabled={loading || draft.status === "archived"}
        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        <Archive className="w-3 h-3" />
        Archive
      </button>
    </>
  );
}
