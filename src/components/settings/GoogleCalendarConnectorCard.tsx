"use client";

import { useState, useEffect } from "react";
import { Calendar, CheckCircle, RefreshCw, AlertCircle, Trash2, Power } from "lucide-react";

interface StatusData {
  connected: boolean;
  configured: boolean;
  encryptionKeyPresent: boolean;
  email?: string;
  lastSyncAt?: string;
  lastError?: string;
  [key: string]: unknown;
}

export function GoogleCalendarConnectorCard() {
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncDays, setSyncDays] = useState("30");
  const [syncResult, setSyncResult] = useState<string | null>(null);


  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/integrations/google-calendar/status");
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error("Failed to fetch Google Calendar status", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStatus();
  }, []);

  const handleConnect = () => {
    window.location.href = "/api/integrations/google-calendar/start";
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar? Local events will remain but won't sync anymore.")) return;
    try {
      setLoading(true);
      await fetch("/api/integrations/google-calendar/disconnect", { method: "POST" });
      await fetchStatus();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const res = await fetch("/api/integrations/google-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: syncDays })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sync failed");
      setSyncResult(`Imported: ${data.imported}, Updated: ${data.updated}, Skipped: ${data.skipped}`);
      await fetchStatus();
    } catch (e) {
      setSyncResult(`Error: ${(e as Error).message}`);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white/5 border border-white/10 rounded-2xl animate-pulse">
        <div className="h-6 w-1/3 bg-white/10 rounded mb-4"></div>
        <div className="h-4 w-1/2 bg-white/10 rounded"></div>
      </div>
    );
  }

  const isConfigured = status?.configured;
  const isKeyPresent = status?.encryptionKeyPresent;
  const isConnected = status?.connected;

  return (
    <div className="p-6 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Calendar size={120} />
      </div>
      
      <div className="flex items-center gap-3 mb-4">
        <Calendar className="text-blue-400" size={24} />
        <h3 className="text-lg font-bold text-white">Google Calendar</h3>
        {isConnected && <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1"><CheckCircle size={12} /> Connected</span>}
        {!isConnected && <span className="px-2 py-1 bg-zinc-500/20 text-zinc-400 text-xs rounded-full">Not Connected</span>}
      </div>

      <p className="text-sm text-zinc-400 mb-6 max-w-sm">
        Google Calendar integration is in local beta. Events are imported read-only into your local Personal Assist workspace. The app does not create, edit, delete, or send calendar invites.
      </p>

      {!isConfigured && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 flex items-start gap-2">
          <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-red-300">Missing GOOGLE_CALENDAR_CLIENT_ID or Secret in environment.</p>
        </div>
      )}

      {isConfigured && !isKeyPresent && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-4 flex items-start gap-2">
          <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
          <p className="text-xs text-red-300">Missing ENCRYPTION_KEY in environment. Required for secure token storage.</p>
        </div>
      )}

      {isConnected ? (
        <div className="space-y-4">
          <div className="p-3 bg-black/40 rounded-xl border border-white/5 text-xs text-zinc-300">
            <p><strong>Account:</strong> {status.email}</p>
            <p><strong>Last Sync:</strong> {status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : "Never"}</p>
            {status.lastError && <p className="text-red-400 mt-1"><strong>Error:</strong> {status.lastError}</p>}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <select 
              value={syncDays}
              onChange={e => setSyncDays(e.target.value)}
              className="px-3 py-2 bg-white/10 border border-white/10 rounded-xl text-sm text-white outline-none"
              disabled={syncing}
            >
              <option value="7">Next 7 days</option>
              <option value="30">Next 30 days</option>
              <option value="90">Next 90 days</option>
            </select>
            
            <button 
              onClick={handleSync}
              disabled={syncing}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
            
            <button 
              onClick={handleDisconnect}
              disabled={syncing}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 sm:ml-auto"
            >
              <Trash2 size={16} />
              Disconnect
            </button>
          </div>
          {syncResult && (
            <p className="text-xs text-blue-400 mt-2">{syncResult}</p>
          )}
        </div>
      ) : (
        <button 
          onClick={handleConnect}
          disabled={!isConfigured || !isKeyPresent}
          className="px-4 py-2 bg-white text-black font-medium rounded-xl hover:bg-zinc-200 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Power size={16} />
          Connect Google Calendar
        </button>
      )}
    </div>
  );
}
