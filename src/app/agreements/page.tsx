import Link from "next/link";
import { FileSignature, LayoutTemplate, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AgreementsClient } from "./AgreementsClient";

export const dynamic = "force-dynamic";

export default async function AgreementsPage() {
  const agreements = await prisma.agreement.findMany({ orderBy: { updatedAt: "desc" }, take: 30, include: { _count: { select: { recipients: true, risks: true } } } });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><FileSignature className="text-blue-400" /> Agreements</h1>
        <p className="text-zinc-400">
          A <strong className="text-white">local agreement &amp; e-signature workflow</strong> — an audit-friendly signing
          simulation with hashing, certificates, clause extraction, heuristic risk, and Q&amp;A.
        </p>
        <div className="mt-3"><Link href="/agreements/templates" className="text-xs px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-zinc-200 inline-flex items-center gap-1"><LayoutTemplate className="w-3 h-3" /> Templates</Link></div>
      </div>
      <AgreementsClient />
      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-3">Your agreements</h2>
        {agreements.length === 0 ? <p className="text-sm text-zinc-500">No agreements yet. Create one above or start from a template.</p> : (
          <ul className="space-y-2">
            {agreements.map((a) => (
              <li key={a.id}>
                <Link href={`/agreements/${a.id}`} className="glass-card rounded-xl p-3 flex items-center justify-between hover:border-white/30 border border-white/10 transition-all">
                  <div><div className="font-medium text-white text-sm">{a.title}</div><div className="text-xs text-zinc-400">{a._count.recipients} recipient(s) · {a._count.risks} risk(s)</div></div>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-zinc-300">{a.status.replace(/_/g, " ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-[11px] text-zinc-500 mt-6 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Not legally binding · not a DocuSign legal/compliance replacement · not legal advice. No emails sent, no provider actions.</p>
    </div>
  );
}
