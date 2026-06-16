"use client";

import { useState, useEffect } from "react";
import {
  PenSquare,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Settings,
  Lock,
  LogOut,
  ShieldCheck,
} from "lucide-react";

interface StatusData {
  connected: boolean;
  configured: boolean;
  redirectConfigured: boolean;
  encryptionKeyPresent: boolean;
  email?: string;
  lastError?: string;
  [key: string]: unknown;
}

export function GmailDraftConnectorCard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);



  async function fetchStatus() {
    try {
      const res = await fetch("/api/integrations/gmail-draft/status");
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus();
  }, []);

  async function handleDisconnect() {
    setLoading(true);
    try {
      await fetch("/api/integrations/gmail-draft/disconnect", { method: "POST" });
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !status) {
    return (
      <div className="glass-card p-6 rounded-2xl animate-pulse">
        <div className="h-6 w-40 bg-white/10 rounded mb-4"></div>
        <div className="h-4 w-48 bg-white/10 rounded"></div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
            <PenSquare size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-white">Gmail Draft Creation</h3>
            <p className="text-sm text-gray-400">Create drafts only — never sends</p>
          </div>
        </div>
        {status?.connected ? (
          <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1 border border-green-500/20">
            <CheckCircle2 size={16} /> Connected
          </span>
        ) : (
          <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full flex items-center gap-1 border border-gray-500/20">
            <XCircle size={16} /> Not Connected
          </span>
        )}
      </div>

      <div className="text-sm text-gray-400 border-t border-white/5 pt-4">
        <p className="mb-2 text-amber-300 flex items-start gap-2 bg-amber-500/10 p-3 rounded-lg border border-amber-500/20">
          <AlertTriangle className="shrink-0 mt-0.5" size={16} />
          This permission can manage Gmail drafts and has broader mailbox capability.
          Personal Assist only creates drafts and never sends emails. Provider-side draft
          creation requires broader OAuth permissions than read-only access.
        </p>
        <p className="mb-3 text-green-300 flex items-start gap-2 bg-green-500/10 p-3 rounded-lg border border-green-500/20">
          <ShieldCheck className="shrink-0 mt-0.5" size={16} />
          No-send guarantee: this connector only calls Gmail&apos;s create-draft endpoint.
          You must review and send manually from Gmail. The read-only Gmail connector is
          kept separate and unchanged.
        </p>

        <p className="text-xs text-gray-500 mb-1">
          Required scope: <code className="text-amber-300">gmail.compose</code>
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Attachment upload: small files via MIME draft rebuild (≤ 3 MB). Large Gmail
          attachments are deferred — attach them manually in Gmail.
        </p>

        {!status?.configured && (
          <p className="text-red-400 flex items-center gap-2 mb-2">
            <Settings size={16} /> Missing GOOGLE_GMAIL_DRAFT_CLIENT_ID / _SECRET
          </p>
        )}
        {!status?.redirectConfigured && (
          <p className="text-yellow-400 flex items-center gap-2 mb-2">
            <Settings size={16} /> Missing GOOGLE_GMAIL_DRAFT_REDIRECT_URI
          </p>
        )}
        {!status?.encryptionKeyPresent && (
          <p className="text-red-400 flex items-center gap-2 mb-2">
            <Lock size={16} /> Missing ENCRYPTION_KEY
          </p>
        )}

        {status?.connected && (
          <div className="space-y-2 mt-4 bg-black/20 p-4 rounded-lg">
            <p>
              <strong className="text-gray-300">Account:</strong> {status.email}
            </p>
            {status.lastError && (
              <p className="text-red-400">
                <strong className="text-gray-300">Last Error:</strong> {status.lastError}
              </p>
            )}
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
              <div className="flex-1"></div>
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <LogOut size={16} /> Disconnect
              </button>
            </div>
          </div>
        )}

        {!status?.connected && status?.configured && status?.encryptionKeyPresent && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <a
              href="/api/integrations/gmail-draft/start"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <PenSquare size={16} /> Connect Gmail Draft
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
