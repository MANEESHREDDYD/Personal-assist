"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { parseSchedulingInstruction } from "@/app/actions/schedulingSecretary";

const EXAMPLES = [
  "schedule 30 minutes with Alex next week",
  "find 3 times next week for a product review",
  "book a 45-minute investor call next Tuesday",
  "set up a 1:1 with my manager this week",
  "follow up if they don't reply in 24 hours",
];

export function CommandInput({ sourceType, sourceRef }: { sourceType?: string; sourceRef?: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(value?: string) {
    const cmd = value ?? text;
    if (!cmd.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await parseSchedulingInstruction({ text: cmd, sourceType, sourceRef });
      if (res.success && res.id) router.push(`/assistant/scheduling/${res.id}`);
      else setError(res.error || "Could not parse the request.");
    });
  }

  return (
    <div className="space-y-3">
      <div className="glass-card rounded-2xl p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder='e.g. "schedule 30 minutes with Alex next week"'
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        <button onClick={() => run()} disabled={pending || !text.trim()} className="mt-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2">
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Parse request
        </button>
        {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button key={ex} onClick={() => run(ex)} disabled={pending} className="px-3 py-1.5 bg-black/30 border border-white/10 rounded-full text-xs text-zinc-300 hover:text-white hover:border-white/30 disabled:opacity-50">{ex}</button>
        ))}
      </div>
    </div>
  );
}
