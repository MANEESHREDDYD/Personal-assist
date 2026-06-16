"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Command, Sparkles, ShieldCheck, Save, Loader2 } from "lucide-react";
import { runRoleCommand, saveProposedDraft, type ProposedAction } from "@/app/actions/commandCenter";
import { ROLES, type RoleId } from "@/lib/roles/registry";

export function CommandCenterClient({
  role,
  initialCommand,
}: {
  role: RoleId;
  initialCommand?: string;
}) {
  const router = useRouter();
  const def = ROLES[role];
  const [command, setCommand] = useState(initialCommand || "");
  const [context, setContext] = useState("");
  const [action, setAction] = useState<ProposedAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(cmd?: string) {
    const c = cmd ?? command;
    if (cmd) setCommand(cmd);
    setError(null);
    setSaved(null);
    setAction(null);
    startTransition(async () => {
      const res = await runRoleCommand({ role, command: c, context });
      if (res.success && res.action) setAction(res.action);
      else setError(res.error || "Command failed");
    });
  }

  function save() {
    if (!action) return;
    startTransition(async () => {
      const res = await saveProposedDraft({ title: action.title, body: action.body, role });
      if (res.success) {
        setSaved(res.id || "saved");
        router.refresh();
      } else {
        setError(res.error || "Save failed");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {def.commandSuggestions.map((s) => (
          <button
            key={s}
            onClick={() => run(s)}
            disabled={pending}
            className="px-3 py-1.5 bg-black/30 border border-white/10 rounded-full text-xs text-zinc-300 hover:text-white hover:border-white/30 disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Command</label>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder={`Ask as a ${def.label}…`}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
        />
        <label className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Context (optional — paste a syllabus, incident, notes…)</label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={4}
          placeholder="Paste relevant text here for grounded output."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 text-sm"
        />
        <button
          onClick={() => run()}
          disabled={pending || command.trim().length === 0}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2"
        >
          {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Propose action
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{error}</p>}

      {action && (
        <div className="glass-card rounded-2xl p-5 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-white">{action.title}</h3>
            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-zinc-300">{action.kind}</span>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-zinc-300 bg-black/30 p-4 rounded-lg border border-white/5 max-h-96 overflow-y-auto">{action.body}</pre>
          <p className="text-[11px] text-amber-300/90 flex items-center gap-1 mt-3">
            <ShieldCheck className="w-3 h-3" /> {action.note}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={save} disabled={pending} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> Save as local draft
            </button>
            {saved && (
              <Link href="/drafts" className="text-xs text-green-400 hover:underline">Saved → view in Drafts</Link>
            )}
          </div>
        </div>
      )}

      <p className="text-[11px] text-zinc-500 flex items-center gap-1">
        <Command className="w-3 h-3" /> Commands create local proposals only. No email is sent and no external calendar is written without explicit approval.
      </p>
    </div>
  );
}
