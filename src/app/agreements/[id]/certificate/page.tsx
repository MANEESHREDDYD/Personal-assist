import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AgreementNav } from "../AgreementNav";
import { ActionButtons } from "../AgreementClients";

export const dynamic = "force-dynamic";

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ag = await prisma.agreement.findUnique({ where: { id }, include: { certificates: { orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!ag) notFound();
  const cert = ag.certificates[0];
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{ag.title} — Certificate</h1>
      <AgreementNav id={id} active="Certificate" />
      <div className="mb-4"><ActionButtons agreementId={id} /></div>
      {!cert ? (
        <div className="glass-card rounded-2xl p-10 text-center"><p className="text-zinc-400">No certificate yet. Click <strong>Certificate</strong> above to generate a local audit certificate (JSON + Markdown).</p></div>
      ) : (
        <div className="space-y-4">
          <div className="glass-card rounded-xl p-4">
            <h2 className="font-bold text-white text-sm mb-2">Markdown certificate</h2>
            <pre className="whitespace-pre-wrap text-xs text-zinc-300 max-h-96 overflow-y-auto">{cert.markdown}</pre>
          </div>
          <details className="glass-card rounded-xl p-4">
            <summary className="text-sm text-zinc-300 cursor-pointer">JSON certificate</summary>
            <pre className="whitespace-pre-wrap text-[10px] text-zinc-400 mt-2 max-h-96 overflow-y-auto">{cert.json}</pre>
          </details>
        </div>
      )}
      <p className="text-[11px] text-zinc-500 mt-4 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Local audit artifact (SHA-256 hashes + timeline). Not legally binding, not court-admissible, not a DocuSign replacement. Export is local only.</p>
    </div>
  );
}
