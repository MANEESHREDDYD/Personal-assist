"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createAgreement } from "@/app/actions/agreements";

export function AgreementsClient() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  function create() {
    if (!title.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createAgreement({ title, content });
      if (res.success && res.id) router.push(`/agreements/${res.id}/prepare`);
      else setError(res.error || "Failed");
    });
  }

  return (
    <div className="glass-card rounded-2xl p-5 space-y-3">
      <h2 className="font-bold text-white">New agreement</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Agreement title" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
      <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} placeholder="Paste or type the agreement text here (used for clause extraction, risk, and Q&A)…" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
      <button onClick={create} disabled={pending || !title.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create &amp; prepare
      </button>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
