"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Send, CheckCircle2, XCircle, FileText, ShieldAlert, Bell, BadgeCheck } from "lucide-react";
import {
  addRecipient, addField, prepareAgreement, completeField, signRecipient, declineRecipient,
  generateCertificate, runClauseExtraction, runRiskScoring, createReminder, askAgreement, voidAgreement,
} from "@/app/actions/agreements";
import type { FieldType } from "@/lib/agreements/types";

function useAct() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function act(fn: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => { const r = await fn(); if (!r.success && r.error) alert(r.error); router.refresh(); });
  }
  return { pending, act };
}

export function PrepareForms({ agreementId, recipients }: { agreementId: string; recipients: { id: string; name: string }[] }) {
  const { pending, act } = useAct();
  const [name, setName] = useState("");
  const [order, setOrder] = useState(recipients.length + 1);
  const [ftype, setFtype] = useState<FieldType>("signature");
  const [frecip, setFrecip] = useState("");

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-bold text-white mb-2">Add recipient (signer)</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Recipient name" className="flex-1 min-w-[160px] bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
          <label className="text-xs text-zinc-400">order <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value) || 1)} className="ml-1 w-16 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" /></label>
          <button onClick={() => { if (name.trim()) { act(() => addRecipient(agreementId, { name, routingOrder: order })); setName(""); setOrder(order + 1); } }} disabled={pending} className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4" /> Add</button>
        </div>
      </div>

      <div className="glass-card rounded-xl p-4">
        <h3 className="text-sm font-bold text-white mb-2">Add field</h3>
        <div className="flex flex-wrap gap-2 items-end">
          <select value={ftype} onChange={(e) => setFtype(e.target.value as FieldType)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm">{["signature", "initials", "text", "date", "checkbox"].map((t) => <option key={t} value={t}>{t}</option>)}</select>
          <select value={frecip} onChange={(e) => setFrecip(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"><option value="">Assign to…</option>{recipients.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <button onClick={() => act(() => addField(agreementId, { type: ftype, recipientId: frecip || null }))} disabled={pending} className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"><Plus className="w-4 h-4" /> Add field</button>
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">Field placement uses an honest preview-based model (type + assignee + required). Page coordinates are stored for future PDF rendering.</p>
      </div>

      <button onClick={() => act(() => prepareAgreement(agreementId))} disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Prepare &amp; open local signing
      </button>
    </div>
  );
}

export function SignBlock({ agreementId, recipientId, fields, canSign }: { agreementId: string; recipientId: string; fields: { id: string; type: string; label: string | null; required: boolean; value: string | null }[]; canSign: boolean }) {
  const { pending, act } = useAct();
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(fields.map((f) => [f.id, f.value ?? (f.type === "date" ? new Date().toISOString().slice(0, 10) : "")])));

  return (
    <div className="space-y-2">
      {fields.map((f) => (
        <div key={f.id} className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 w-24">{f.label || f.type}{f.required ? " *" : ""}</span>
          {f.type === "checkbox" ? (
            <input type="checkbox" checked={values[f.id] === "true"} onChange={(e) => setValues({ ...values, [f.id]: e.target.checked ? "true" : "false" })} />
          ) : (
            <input type={f.type === "date" ? "date" : "text"} value={values[f.id] || ""} onChange={(e) => setValues({ ...values, [f.id]: e.target.value })} placeholder={f.type === "signature" ? "Type your full name" : ""} className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1.5 text-white text-sm" />
          )}
          {f.value ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : (
            <button onClick={() => act(() => completeField(f.id, values[f.id] ?? ""))} disabled={pending} className="px-2 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs disabled:opacity-50">Save</button>
          )}
        </div>
      ))}
      <div className="flex gap-2 pt-1">
        <button onClick={() => act(() => signRecipient(agreementId, recipientId))} disabled={pending || !canSign} className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded text-xs flex items-center gap-1 disabled:opacity-50"><CheckCircle2 className="w-3 h-3" /> Sign</button>
        <button onClick={() => act(() => declineRecipient(agreementId, recipientId))} disabled={pending} className="px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded text-xs flex items-center gap-1 disabled:opacity-50"><XCircle className="w-3 h-3" /> Decline</button>
      </div>
    </div>
  );
}

export function ActionButtons({ agreementId }: { agreementId: string }) {
  const { pending, act } = useAct();
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => act(() => runClauseExtraction(agreementId))} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><FileText className="w-3 h-3" /> Extract clauses</button>
      <button onClick={() => act(() => runRiskScoring(agreementId))} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><ShieldAlert className="w-3 h-3" /> Score risks</button>
      <button onClick={() => act(() => generateCertificate(agreementId))} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><BadgeCheck className="w-3 h-3" /> Certificate</button>
      <button onClick={() => act(() => createReminder(agreementId, { days: 3 }))} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><Bell className="w-3 h-3" /> Reminder draft</button>
      <button onClick={() => act(() => voidAgreement(agreementId))} disabled={pending} className="px-3 py-1.5 bg-red-500/15 text-red-400 hover:bg-red-500/25 rounded-lg text-xs flex items-center gap-1 disabled:opacity-50"><XCircle className="w-3 h-3" /> Void</button>
    </div>
  );
}

export function QaClient({ agreementId }: { agreementId: string }) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function ask() {
    if (!q.trim()) return;
    startTransition(async () => {
      const r = await askAgreement(agreementId, q) as { success: boolean; answer?: string; error?: string };
      setAnswer(r.success ? (r.answer ?? "No answer.") : (r.error || "Failed"));
    });
  }
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about this agreement (e.g. when does it renew?)" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
        <button onClick={ask} disabled={pending || !q.trim()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">{pending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ask"}</button>
      </div>
      {answer && <div className="glass-card rounded-lg p-3 text-sm text-zinc-200">{answer}</div>}
    </div>
  );
}
