"use client";

import { useState } from "react";
import { processMockEmail, processEmlUpload } from "../actions/inbox";
import { Send, Loader2, Upload, FileText } from "lucide-react";

export function InboxForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"paste" | "upload">("paste");

  async function onSubmitPaste(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await processMockEmail(formData);

    if (res.success) {
      (e.target as HTMLFormElement).reset();
    } else {
      setError(res.error || "Failed to process email");
    }
    setLoading(false);
  }

  async function onSubmitUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await processEmlUpload(formData);

    if (res.success) {
      (e.target as HTMLFormElement).reset();
    } else {
      setError(res.error || "Failed to process .eml file");
    }
    setLoading(false);
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
        <button 
          onClick={() => setMode("paste")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${mode === "paste" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <FileText className="w-4 h-4" />
          Paste Content
        </button>
        <button 
          onClick={() => setMode("upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-colors ${mode === "upload" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"}`}
        >
          <Upload className="w-4 h-4" />
          Upload .eml
        </button>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 text-red-400 text-sm border border-red-500/20">{error}</div>}

      {mode === "paste" ? (
        <form onSubmit={onSubmitPaste} className="space-y-4">
          <div>
            <label className="text-sm font-bold uppercase tracking-wider text-zinc-500">Sender</label>
            <input 
              type="email" 
              name="sender" 
              required 
              placeholder="boss@company.com" 
              className="mt-1 w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>

          <div>
            <label className="text-sm font-bold uppercase tracking-wider text-zinc-500">Subject</label>
            <input 
              type="text" 
              name="subject" 
              required 
              placeholder="Invoice for Project X" 
              className="mt-1 w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>

          <div>
            <label className="text-sm font-bold uppercase tracking-wider text-zinc-500">Body</label>
            <textarea 
              name="body" 
              required 
              rows={5} 
              placeholder="Please find attached the invoice..." 
              className="mt-1 w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex justify-center items-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Process Pasted Email"}
          </button>
        </form>
      ) : (
        <form onSubmit={onSubmitUpload} className="space-y-4">
          <div>
            <label className="text-sm font-bold uppercase tracking-wider text-zinc-500">Select .eml file</label>
            <input 
              type="file" 
              name="file" 
              accept=".eml"
              required 
              className="mt-1 w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 transition-shadow file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-400 hover:file:bg-blue-500/30 cursor-pointer"
            />
            <p className="text-xs text-zinc-500 mt-2">Upload a raw .eml file exported from Gmail or Outlook.</p>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity flex justify-center items-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Upload and Parse"}
          </button>
        </form>
      )}
    </div>
  );
}
