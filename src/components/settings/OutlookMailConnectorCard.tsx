"use client";

import { useState, useEffect } from "react";
import { Mail, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Settings, Lock, LogOut } from "lucide-react";

interface StatusData {
  connected: boolean;
  configured: boolean;
  redirectConfigured: boolean;
  encryptionKeyPresent: boolean;
  email?: string;
  lastSyncAt?: string;
  lastError?: string;
  [key: string]: unknown;
}

export function OutlookMailConnectorCard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncLimit, setSyncLimit] = useState("10");
  const [syncResult, setSyncResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/integrations/outlook-mail/status");
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
      await fetch("/api/integrations/outlook-mail/disconnect", { method: "POST" });
      await fetchStatus();
      setSyncResult(null);
      setSyncError(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      const res = await fetch("/api/integrations/outlook-mail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: syncLimit })
      });
      const data = await res.json();
      if (res.ok) {
        setSyncResult({ imported: data.imported, skipped: data.skipped });
      } else {
        setSyncError(data.error || "Sync failed.");
      }
      await fetchStatus();
    } catch (e: unknown) {
      const err = e as Error;
      setSyncError(err?.message || "Failed to sync");
    } finally {
      setSyncing(false);
    }
  }

  if (loading || !status) {
    return (
      <div className="glass-card p-6 rounded-2xl animate-pulse">
        <div className="h-6 w-32 bg-white/10 rounded mb-4"></div>
        <div className="h-4 w-48 bg-white/10 rounded"></div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
            <Mail size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-white">Outlook Mail</h3>
            <p className="text-sm text-gray-400">Read-Only Local Beta</p>
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
        <p className="mb-2 text-blue-300 flex items-start gap-2 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
          <AlertTriangle className="shrink-0 mt-0.5" size={16} />
          Outlook Mail integration is in local beta. Emails are imported read-only into your local Personal Assist workspace. The app does not send, delete, move, mark read/unread, categorize, or modify Outlook messages.
        </p>

        {!status?.configured && (
          <p className="text-red-400 flex items-center gap-2 mb-2">
            <Settings size={16} /> Missing MICROSOFT_CLIENT_ID / MICROSOFT_CLIENT_SECRET
          </p>
        )}
        {!status?.redirectConfigured && (
          <p className="text-yellow-400 flex items-center gap-2 mb-2">
            <Settings size={16} /> Missing MICROSOFT_OUTLOOK_MAIL_REDIRECT_URI
          </p>
        )}
        {!status?.encryptionKeyPresent && (
          <p className="text-red-400 flex items-center gap-2 mb-2">
            <Lock size={16} /> Missing ENCRYPTION_KEY
          </p>
        )}

        {status?.connected && (
          <div className="space-y-2 mt-4 bg-black/20 p-4 rounded-lg">
            <p><strong className="text-gray-300">Account:</strong> {status.email}</p>
            <p><strong className="text-gray-300">Last Sync:</strong> {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"}</p>
            {status.lastError && (
              <p className="text-red-400"><strong className="text-gray-300">Last Error:</strong> {status.lastError}</p>
            )}
            
            {syncResult && (
              <p className="text-green-400 text-xs bg-green-500/10 p-2 rounded mt-2">
                Sync complete: {syncResult.imported} imported, {syncResult.skipped} skipped/duplicate.
              </p>
            )}
            {syncError && (
              <p className="text-red-400 text-xs bg-red-500/10 p-2 rounded mt-2">
                Sync failed: {syncError}
              </p>
            )}

            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
              <select 
                value={syncLimit}
                onChange={(e) => setSyncLimit(e.target.value)}
                className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                disabled={syncing}
              >
                <option value="10">Last 10 emails</option>
                <option value="25">Last 25 emails</option>
              </select>

              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {syncing ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                {syncing ? "Syncing..." : "Sync Now"}
              </button>

              <div className="flex-1"></div>

              <button
                onClick={handleDisconnect}
                disabled={syncing}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogOut size={16} /> Disconnect
              </button>
            </div>
          </div>
        )}
        
        {!status?.connected && status?.configured && status?.encryptionKeyPresent && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <a
              href="/api/integrations/outlook-mail/start"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Mail size={16} /> Connect Outlook Mail
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
