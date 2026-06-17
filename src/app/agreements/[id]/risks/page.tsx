import { notFound } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AgreementNav } from "../AgreementNav";
import { ActionButtons } from "../AgreementClients";

export const dynamic = "force-dynamic";

const LEVEL_COLOR: Record<string, string> = { low: "text-zinc-400", medium: "text-yellow-400", high: "text-orange-400", critical: "text-red-400" };

export default async function AgreementRisks({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ag = await prisma.agreement.findUnique({ where: { id }, include: { risks: { where: { resolved: false }, orderBy: { createdAt: "desc" } }, clauses: { orderBy: { createdAt: "asc" } } } });
  if (!ag) notFound();
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{ag.title} — Risks &amp; clauses</h1>
      <AgreementNav id={id} active="Risks" />
      <div className="mb-4"><ActionButtons agreementId={id} /></div>

      <section className="mb-6">
        <h2 className="font-bold text-white text-sm mb-2">Heuristic risk findings (decision-support only)</h2>
        {ag.risks.length === 0 ? <p className="text-sm text-zinc-500">No risks scored yet. Click <strong>Score risks</strong> above.</p> : (
          <ul className="space-y-2">
            {ag.risks.map((r) => (
              <li key={r.id} className="glass-card rounded-lg p-3 flex items-start gap-2 text-sm">
                <AlertTriangle className={`w-4 h-4 mt-0.5 ${LEVEL_COLOR[r.level]}`} />
                <div><span className={`text-[10px] uppercase tracking-wider font-bold ${LEVEL_COLOR[r.level]}`}>{r.level}</span><span className="text-zinc-500 text-[10px] ml-2">{r.kind.replace(/_/g, " ")}</span><p className="text-zinc-200">{r.detail}</p></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-bold text-white text-sm mb-2">Extracted clauses (heuristic)</h2>
        {ag.clauses.length === 0 ? <p className="text-sm text-zinc-500">No clauses extracted yet. Click <strong>Extract clauses</strong> above.</p> : (
          <ul className="text-sm text-zinc-300 space-y-1">{ag.clauses.map((c) => <li key={c.id} className="flex justify-between gap-2"><span className="text-zinc-500 text-xs w-40 shrink-0">{c.kind.replace(/_/g, " ")}</span><span className="flex-1">{c.value}</span></li>)}</ul>
        )}
      </section>
      <p className="text-[11px] text-zinc-500 mt-4">Heuristic extraction and risk — not legal advice.</p>
    </div>
  );
}
