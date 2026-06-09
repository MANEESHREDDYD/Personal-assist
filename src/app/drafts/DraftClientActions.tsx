"use client";

import { useState } from "react";
import { updateDraftStatus, markDraftExported, markDraftManuallySent, reopenDraft, logClipboardAction } from "../actions/drafts";
import { Check, Copy, Archive, Loader2, Download, ExternalLink, RotateCcw } from "lucide-react";
import { parseMetadata } from "@/lib/metadata";
import { ProviderDraftActions } from "./ProviderDraftActions";

export function DraftClientActions({ draft }: { draft: any }) {
  const [loading, setLoading] = useState(false);
  const meta = parseMetadata(draft.metadata);
  const isApproved = draft.status === "approved";
  const isNeedsChanges = draft.status === "needs_changes";
  const isRejected = draft.status === "rejected";

  async function handleStatus(newStatus: string) {
    setLoading(true);
    await updateDraftStatus(draft.id, newStatus);
    setLoading(false);
  }

  async function handleCopy(type: 'subject' | 'body' | 'full') {
    let text = "";
    if (type === 'subject') text = draft.subject || "";
    if (type === 'body') text = draft.body || "";
    if (type === 'full') {
      text = `To: ${draft.to || ""}\nSubject: ${draft.subject || ""}\n\n${draft.body || ""}\n\n[Note: This is a local draft. You must manually attach any required documents before sending.]`;
    }
    navigator.clipboard.writeText(text);
    await logClipboardAction(draft.id, type);
  }

  async function handleMarkExported() {
    setLoading(true);
    await markDraftExported(draft.id);
    setLoading(false);
  }

  async function handleMarkManuallySent() {
    setLoading(true);
    await markDraftManuallySent(draft.id);
    setLoading(false);
  }

  async function handleReopen() {
    setLoading(true);
    await reopenDraft(draft.id);
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      {/* Primary Actions based on status */}
      <div className="flex gap-2 flex-wrap">
        {!isApproved && !isRejected && (
          <>
            <button 
              onClick={() => handleStatus("approved")}
              disabled={loading}
              className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Approve Locally
            </button>
            <button 
              onClick={() => handleStatus("needs_changes")}
              disabled={loading || isNeedsChanges}
              className="px-3 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              Mark Needs Changes
            </button>
            <button 
              onClick={() => handleStatus("rejected")}
              disabled={loading}
              className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              Reject
            </button>
          </>
        )}

        {(isApproved || isRejected) && (
          <button 
            onClick={handleReopen}
            disabled={loading}
            className="px-3 py-1.5 bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
            Reopen Draft
          </button>
        )}
      </div>

      {isNeedsChanges && (
        <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded-lg text-sm text-orange-400">
          Warning: This draft needs changes. You can copy the text below, but it is not approved for final export.
        </div>
      )}

      {isRejected && (
        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-sm text-red-400">
          Warning: This draft was rejected. Export and manual sending is blocked.
        </div>
      )}

      {/* Export Panel */}
      {!isRejected && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => handleCopy('subject')} disabled={loading} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-2">
              <Copy className="w-3 h-3" /> Copy Subject
            </button>
            <button onClick={() => handleCopy('body')} disabled={loading} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-2">
              <Copy className="w-3 h-3" /> Copy Body
            </button>
            <button onClick={() => handleCopy('full')} disabled={loading} className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium flex items-center gap-2">
              <Copy className="w-3 h-3" /> Copy Full Draft
            </button>
            {isApproved && (
              <>
                <a href={`/api/drafts/${draft.id}/export/txt`} download className="px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-xs font-medium flex items-center gap-2">
                  <Download className="w-3 h-3" /> Download TXT
                </a>
                <a href={`/api/drafts/${draft.id}/export/eml`} download className="px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-xs font-medium flex items-center gap-2">
                  <Download className="w-3 h-3" /> Download EML
                </a>
              </>
            )}
          </div>

          {isApproved && (
            <div className="bg-black/20 p-4 rounded-lg">
              <h4 className="font-bold text-sm text-zinc-300 mb-2">Manual Send Checklist</h4>
              <ol className="list-decimal list-inside text-xs text-zinc-400 space-y-1 mb-4">
                <li>Copy the subject and body above.</li>
                <li>Download or open any required attached documents.</li>
                <li>Open your email client (Gmail, Outlook, Apple Mail).</li>
                <li>Paste the recipients, subject, and body.</li>
                <li>Attach files manually from your local drive.</li>
                <li>Review carefully and send outside Personal Assist.</li>
                <li>Return here to mark as manually sent.</li>
              </ol>
              <div className="flex gap-2">
                <button onClick={handleMarkExported} disabled={loading || meta.exportStatus === "exported"} className="px-3 py-1.5 bg-white/10 text-zinc-300 hover:bg-white/20 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors">
                  <ExternalLink className="w-3 h-3" /> Mark Exported
                </button>
                <button onClick={handleMarkManuallySent} disabled={loading || meta.exportStatus === "manually_sent"} className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors">
                  <Check className="w-3 h-3" /> Mark Manually Sent
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Provider-side draft creation — approved drafts only, never sends */}
      {isApproved && <ProviderDraftActions draft={draft} />}
    </div>
  );
}
