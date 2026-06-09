"use client";

import { useState, useEffect } from "react";
import { Mail, Zap, RefreshCw, LogOut, AlertTriangle, ShieldAlert, CheckCircle2 } from "lucide-react";

export function GmailConnectorCard() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncLimit, setSyncLimit] = useState("10");

  useEffect(() => {
    fetchStatus();
  }, []);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/integrations/gmail/status");
      const data = await res.json();
      setStatus(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect() {
    window.location.href = "/api/integrations/gmail/start";
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      await fetch("/api/integrations/gmail/disconnect", { method: "POST" });
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/integrations/gmail/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: syncLimit })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Sync completed! Imported: ${data.imported}, Skipped: ${data.skipped}`);
      } else {
        alert(`Sync failed: ${data.error}`);
      }
      await fetchStatus();
    } catch (e) {
      alert("Failed to sync");
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

  const isConnected = status.status === "connected";
  const hasError = status.status === "error";

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/10 hover:border-white/20 transition-all">
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${isConnected ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-zinc-400'}`}>
            <Mail size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              Gmail (Local Beta)
              {isConnected && <CheckCircle2 size={16} className="text-green-400" />}
            </h3>
            <p className="text-sm text-zinc-400">Read-only inbox sync</p>
          </div>
        </div>
        
        {isConnected ? (
          <span className="px-3 py-1 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-medium">
            Connected
          </span>
        ) : (
          <span className="px-3 py-1 bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 rounded-full text-xs font-medium">
            Not Connected
          </span>
        )}
      </div>

      <div className="space-y-4 mb-6">
        {!status.configured && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm flex gap-2">
            <AlertTriangle className="shrink-0" size={18} />
            <p>Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET. See README.</p>
          </div>
        )}

        {!status.encryptionKeyValid && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex gap-2">
            <ShieldAlert className="shrink-0" size={18} />
            <p>Missing or invalid 32-byte ENCRYPTION_KEY. Generate using openssl rand -base64 32.</p>
          </div>
        )}

        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm flex gap-2">
           <ShieldAlert className="shrink-0" size={18} />
           <p><strong>Safe Local Mode:</strong> Gmail integration is in local beta. Emails are imported read-only into your local Personal Assist workspace. The app does not send, delete, label, or modify Gmail messages.</p>
        </div>

        {isConnected && (
          <div className="bg-black/30 rounded-xl p-4 space-y-2 border border-white/5">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Account</span>
              <span className="text-zinc-300">{status.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Last Sync</span>
              <span className="text-zinc-300">
                {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"}
              </span>
            </div>
            {hasError && (
              <div className="flex justify-between text-sm">
                <span className="text-red-500">Last Error</span>
                <span className="text-red-400 text-right max-w-xs">{status.lastError}</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        {!isConnected ? (
          <button
            onClick={handleConnect}
            disabled={!status.configured || !status.encryptionKeyValid}
            className="flex-1 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Connect Gmail
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded-lg px-3 py-2">
              <span className="text-zinc-500 text-sm">Fetch:</span>
              <select 
                value={syncLimit} 
                onChange={e => setSyncLimit(e.target.value)}
                className="bg-transparent text-white text-sm outline-none border-none cursor-pointer"
              >
                <option value="10" className="bg-zinc-900">10 emails</option>
                <option value="25" className="bg-zinc-900">25 emails</option>
              </select>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-medium rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {syncing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Zap size={18} />
                  Sync Now
                </>
              )}
            </button>
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-500/10 text-red-500 font-medium rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
