import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AgreementNav } from "./AgreementNav";
import { ActionButtons } from "./AgreementClients";

export const dynamic = "force-dynamic";

export default async function AgreementOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ag = await prisma.agreement.findUnique({
    where: { id },
    include: { recipients: { orderBy: { routingOrder: "asc" } }, fields: true, clauses: true, reminders: { orderBy: { createdAt: "desc" } }, auditEvents: { orderBy: { createdAt: "asc" } }, _count: { select: { certificates: true, risks: true } } },
  });
  if (!ag) notFound();

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <Link href="/agreements" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> All agreements</Link>
      <h1 className="text-2xl font-bold text-white">{ag.title}</h1>
      <p className="text-sm text-zinc-400 mb-4">{ag.status.replace(/_/g, " ")} · {ag.recipients.length} recipient(s) · {ag.fields.length} field(s) · {ag._count.risks} risk(s)</p>
      <AgreementNav id={id} active="Overview" />

      <div className="grid sm:grid-cols-2 gap-2 mb-4 text-xs">
        <Hash label="Original hash (SHA-256)" value={ag.originalHash} />
        <Hash label="Final hash" value={ag.finalHash} />
      </div>

      <section className="glass-card rounded-xl p-4 mb-4">
        <h2 className="font-bold text-white text-sm mb-2">Recipients</h2>
        {ag.recipients.length === 0 ? <p className="text-sm text-zinc-500">No recipients. <Link href={`/agreements/${id}/prepare`} className="text-blue-400 hover:underline">Prepare</Link> the agreement.</p> : (
          <ul className="text-sm text-zinc-300 space-y-1">{ag.recipients.map((r) => <li key={r.id} className="flex justify-between"><span>{r.routingOrder}. {r.name}{r.role ? ` (${r.role})` : ""}</span><span className="text-xs text-zinc-500">{r.status}</span></li>)}</ul>
        )}
      </section>

      <section className="mb-4"><h2 className="font-bold text-white text-sm mb-2">Actions</h2><ActionButtons agreementId={id} /></section>

      {ag.reminders.length > 0 && (
        <section className="glass-card rounded-xl p-4 mb-4">
          <h2 className="font-bold text-white text-sm mb-2">Reminder drafts (not sent)</h2>
          {ag.reminders.map((r) => <div key={r.id} className="text-xs text-zinc-300 mb-2"><div className="text-zinc-500">{r.kind} · due {r.dueAt.toLocaleDateString()}</div><div className="font-medium">{r.draftSubject}</div><pre className="whitespace-pre-wrap text-zinc-400">{r.draftBody}</pre></div>)}
        </section>
      )}

      <section className="glass-card rounded-xl p-4">
        <h2 className="font-bold text-white text-sm mb-2">Audit timeline</h2>
        <ul className="text-xs text-zinc-400 space-y-0.5">{ag.auditEvents.map((e) => <li key={e.id}>{e.createdAt.toLocaleString()} — <span className="text-zinc-200">{e.action}</span>{e.actor ? ` by ${e.actor}` : ""}{e.detail ? ` (${e.detail})` : ""}</li>)}</ul>
      </section>

      <p className="text-[11px] text-zinc-500 mt-4 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Local agreement workflow / audit-friendly signing simulation. Not legally binding, not a DocuSign replacement, not legal advice.</p>
    </div>
  );
}

function Hash({ label, value }: { label: string; value: string | null }) {
  return <div className="glass-card rounded-lg p-3"><p className="text-[10px] text-zinc-500">{label}</p><p className="text-zinc-300 break-all font-mono text-[10px]">{value || "—"}</p></div>;
}
