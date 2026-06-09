"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Loader2, AlertTriangle, Ban, CheckCircle2 } from "lucide-react";

interface LinkedDoc {
  id: string;
  name: string;
  size: number;
  contentType: string;
  blocked: boolean;
  tooLarge: boolean;
  attachedGmail: boolean;
  attachedOutlook: boolean;
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Phase 3I — upload selected local documents to an already-created provider draft.
 * Rendered only when an approved draft has at least one provider draft. The upload
 * updates the provider-side draft only; Personal Assist never sends email.
 */
export function ProviderAttachmentActions({
  draftId,
  hasGmail,
  hasOutlook,
}: {
  draftId: string;
  hasGmail: boolean;
  hasOutlook: boolean;
}) {
  const router = useRouter();
  const [docs, setDocs] = useState<LinkedDoc[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState<"gmail_draft" | "outlook_draft" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/api/drafts/${draftId}/provider-attachments`);
      const data = await res.json();
      if (res.ok) setDocs(data.documents || []);
      else setDocs([]);
    } catch {
      setDocs([]);
    }
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function upload(provider: "gmail_draft" | "outlook_draft") {
    const ids = Array.from(selected);
    if (ids.length === 0) {
      setError("Select at least one document to attach.");
      return;
    }
    setUploading(provider);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/drafts/${draftId}/provider-attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, documentIds: ids }),
      });
      const data = await res.json();
      if (res.ok) {
        const summary = (data.results || [])
          .map((r: any) => `${r.name || r.documentId}: ${String(r.status).replace(/_/g, " ")}`)
          .join(" · ");
        setMessage(`${data.message || "Done."}${summary ? ` (${summary})` : ""}`);
        setSelected(new Set());
        await load();
        router.refresh();
      } else {
        setError(data.error || "Attachment upload failed.");
      }
    } catch (e: any) {
      setError(e.message || "Attachment upload failed.");
    } finally {
      setUploading(null);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
      <h5 className="font-bold text-xs text-amber-300 flex items-center gap-2 uppercase tracking-wider">
        <Paperclip className="w-3.5 h-3.5" /> Attach Documents to Provider Draft
      </h5>

      <p className="text-[11px] text-zinc-400">
        Attachment upload updates the provider-side draft only. Personal Assist still does
        not send emails. After uploading, review the draft and attachments inside Gmail or
        Outlook before sending manually. Phase 3I supports files up to 3 MB; large
        attachment upload is planned later.
      </p>

      {docs === null ? (
        <p className="text-[11px] text-zinc-500 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Loading linked documents…
        </p>
      ) : docs.length === 0 ? (
        <p className="text-[11px] text-zinc-500">No local documents linked to this draft.</p>
      ) : (
        <div className="space-y-1.5">
          {docs.map((d) => {
            const disabled = d.blocked || d.tooLarge;
            return (
              <label
                key={d.id}
                className={`flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg border ${
                  disabled
                    ? "border-red-500/20 bg-red-500/5 cursor-not-allowed"
                    : "border-white/10 bg-black/20 cursor-pointer hover:border-white/20"
                }`}
              >
                <input
                  type="checkbox"
                  disabled={disabled || uploading !== null}
                  checked={selected.has(d.id)}
                  onChange={() => toggle(d.id)}
                  className="accent-amber-500"
                />
                <span className="text-zinc-200 truncate flex-1">{d.name}</span>
                <span className="text-zinc-500 shrink-0">{formatSize(d.size)}</span>
                {d.blocked && (
                  <span className="text-red-400 flex items-center gap-0.5 shrink-0">
                    <Ban className="w-3 h-3" /> blocked type
                  </span>
                )}
                {d.tooLarge && !d.blocked && (
                  <span className="text-orange-400 flex items-center gap-0.5 shrink-0" title="Large attachment upload is planned for Phase 3J.">
                    <AlertTriangle className="w-3 h-3" /> &gt; 3 MB
                  </span>
                )}
                {d.attachedGmail && (
                  <span className="text-green-400 flex items-center gap-0.5 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Gmail
                  </span>
                )}
                {d.attachedOutlook && (
                  <span className="text-green-400 flex items-center gap-0.5 shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Outlook
                  </span>
                )}
              </label>
            );
          })}

          <div className="flex flex-wrap gap-2 pt-1">
            {hasGmail && (
              <button
                onClick={() => upload("gmail_draft")}
                disabled={uploading !== null || selected.size === 0}
                className="px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading === "gmail_draft" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                Attach to Gmail Draft
              </button>
            )}
            {hasOutlook && (
              <button
                onClick={() => upload("outlook_draft")}
                disabled={uploading !== null || selected.size === 0}
                className="px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {uploading === "outlook_draft" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
                Attach to Outlook Draft
              </button>
            )}
          </div>
        </div>
      )}

      {hasGmail && (
        <p className="text-[11px] text-orange-400/80 flex items-start gap-1">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          Gmail: attaching rebuilds the draft from your approved local content. If you edited
          the Gmail draft manually, re-attaching may overwrite those edits.
        </p>
      )}

      {message && <p className="text-xs text-green-400 bg-green-500/10 p-2 rounded">{message}</p>}
      {error && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{error}</p>}
    </div>
  );
}
