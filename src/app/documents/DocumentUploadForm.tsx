"use client";

import { useState } from "react";
import { uploadDocument } from "../actions/documents";
import { Upload, Loader2 } from "lucide-react";

export function DocumentUploadForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const res = await uploadDocument(formData);

    if (res.success) {
      // Clear form
      (e.target as HTMLFormElement).reset();
      setLoading(false);
    } else {
      setError(res.error || "Failed to upload document");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex items-center gap-3">
      {error && <span className="text-red-400 text-sm">{error}</span>}
      <input 
        type="file" 
        name="file" 
        required
        className="text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-white/10 file:text-white hover:file:bg-white/20 transition-colors"
      />
      <input 
        type="text" 
        name="notes" 
        placeholder="Optional notes..." 
        className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 w-48"
      />
      <button 
        type="submit" 
        disabled={loading}
        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Upload
      </button>
    </form>
  );
}
