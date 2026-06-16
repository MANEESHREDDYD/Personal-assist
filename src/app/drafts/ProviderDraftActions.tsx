"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PenSquare,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Mail,
} from "lucide-react";
import { parseMetadata } from "@/lib/metadata";
import { ProviderAttachmentActions } from "./ProviderAttachmentActions";

/**
 * Provider-side draft creation actions. Rendered only for approved drafts.
 * Creates a Gmail or Outlook draft after explicit user action. Personal Assist
 * never sends email — the user must review and send manually from their provider.
 */
export function ProviderDraftActions({ draft }: { draft: { id: string; metadata?: string | null } }) {
  const router = useRouter();
  const meta = parseMetadata(draft.metadata);
  const existing = (meta.providerDrafts as Record<string, { webLink?: string;[key: string]: unknown }>) || {};
  const hasGmailDraft = !!existing.gmail;
  const hasOutlookDraft = !!existing.outlook;

  const [gmailStatus, setGmailStatus] = useState<{ connected?: boolean } | null>(null);
  const [outlookStatus, setOutlookStatus] = useState<{ connected?: boolean } | null>(null);
  const [loading, setLoading] = useState<"gmail_draft" | "outlook_draft" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [g, o] = await Promise.all([
          fetch("/api/integrations/gmail-draft/status").then((r) => r.json()),
          fetch("/api/integrations/outlook-draft/status").then((r) => r.json()),
        ]);
        setGmailStatus(g);
        setOutlookStatus(o);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  async function createProviderDraft(provider: "gmail_draft" | "outlook_draft") {
    setLoading(provider);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/drafts/${draft.id}/create-provider-draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || "Provider draft created.");
        router.refresh();
      } else {
        setError(data.error || "Failed to create provider draft.");
      }
    } catch (e) {
      setError((e as Error).message || "Failed to create provider draft.");
    } finally {
      setLoading(null);
    }
  }

  function renderButton(provider: "gmail_draft" | "outlook_draft", label: string) {
    const key = provider === "gmail_draft" ? "gmail" : "outlook";
    const status = provider === "gmail_draft" ? gmailStatus : outlookStatus;
    const already = !!existing[key];
    const connected = status?.connected;

    if (already) {
      const rec = existing[key];
      return (
        <div className="flex flex-col gap-1 bg-green-500/10 border border-green-500/20 px-3 py-2 rounded-lg">
          <span className="text-green-400 text-xs font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> {label} draft created
          </span>
          {rec?.webLink ? (
            <a
              href={rec.webLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> Open in {label}
            </a>
          ) : (
            <span className="text-[11px] text-zinc-500">
              Open {label} → Drafts to review and send.
            </span>
          )}
        </div>
      );
    }

    return (
      <button
        onClick={() => createProviderDraft(provider)}
        disabled={loading !== null || !connected}
        title={connected ? "" : `${label} Draft connector not connected`}
        className="px-3 py-1.5 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {loading === provider ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : provider === "gmail_draft" ? (
          <Mail className="w-3 h-3" />
        ) : (
          <PenSquare className="w-3 h-3" />
        )}
        Create {label} Draft
      </button>
    );
  }

  return (
    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-3">
      <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
        <PenSquare className="w-4 h-4" /> Provider-Side Draft Creation
      </h4>

      <p className="text-xs text-zinc-400">
        Personal Assist can create provider-side drafts only after approval. It does not
        send emails. You must review and send manually from Gmail or Outlook.
      </p>

      <div className="flex flex-wrap gap-2">
        {renderButton("gmail_draft", "Gmail")}
        {renderButton("outlook_draft", "Outlook")}
      </div>

      {(gmailStatus && !gmailStatus.connected) || (outlookStatus && !outlookStatus.connected) ? (
        <p className="text-[11px] text-zinc-500">
          Connect a draft connector in{" "}
          <a href="/settings" className="text-blue-400 hover:underline">
            Settings
          </a>{" "}
          to enable provider-side draft creation. Requires broader OAuth permissions than
          read-only access.
        </p>
      ) : null}

      <p className="text-[11px] text-orange-400 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3 shrink-0" />
        Review inside your email provider before sending. Personal Assist never sends email.
      </p>

      {message && (
        <p className="text-xs text-green-400 bg-green-500/10 p-2 rounded">{message}</p>
      )}
      {error && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{error}</p>}

      {/* Phase 3I — attachment upload, only when a provider draft exists */}
      {(hasGmailDraft || hasOutlookDraft) && (
        <ProviderAttachmentActions
          draftId={draft.id}
          hasGmail={hasGmailDraft}
          hasOutlook={hasOutlookDraft}
        />
      )}
    </div>
  );
}
