"use client";

import { useState } from "react";
import { updateAIPref } from "../actions/settings";
import { Loader2, CheckCircle2, AlertTriangle, Info } from "lucide-react";

export function AISettings({ initialPrefs }: { initialPrefs: { provider: string; ollamaUrl: string; ollamaModel: string } }) {
  const [provider, setProvider] = useState(initialPrefs.provider);
  const [ollamaUrl, setOllamaUrl] = useState(initialPrefs.ollamaUrl);
  const [ollamaModel, setOllamaModel] = useState(initialPrefs.ollamaModel);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });

  async function handleSave() {
    setLoading(true);
    setStatus({ type: null, msg: "" });
    
    await updateAIPref("AI_PROVIDER", provider);
    await updateAIPref("OLLAMA_BASE_URL", ollamaUrl);
    await updateAIPref("OLLAMA_MODEL", ollamaModel);
    
    setStatus({ type: "success", msg: "AI Preferences Saved." });
    setLoading(false);
  }

  return (
    <div className="glass-card rounded-2xl p-8 mb-8 space-y-6">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <CheckCircle2 className="text-green-400" />
        Local Intelligence Layer
      </h2>
      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 mt-0.5" />
        <div className="text-sm text-zinc-300 space-y-1">
          <p><strong>No paid APIs active.</strong> All data remains local.</p>
          <p>If Ollama is selected but unavailable, the system safely falls back to the local rules engine.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active AI Provider</label>
          <select 
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow appearance-none"
          >
            <option value="rules">Rules (Regex/Keyword Fallback)</option>
            <option value="ollama">Ollama (Local LLM)</option>
            <option value="mock">Mock (Deterministic)</option>
          </select>
        </div>

        {provider === "ollama" && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Ollama Base URL</label>
              <input 
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">Ollama Model</label>
              <input 
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
              />
            </div>
          </>
        )}
      </div>

      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        {status.type === "success" && <p className="text-green-400 text-sm font-medium">{status.msg}</p>}
        {status.type === "error" && <p className="text-red-400 text-sm font-medium">{status.msg}</p>}
        {!status.type && <div />}

        <button 
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity flex justify-center items-center gap-2 shadow-lg"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save AI Settings"}
        </button>
      </div>
    </div>
  );
}
