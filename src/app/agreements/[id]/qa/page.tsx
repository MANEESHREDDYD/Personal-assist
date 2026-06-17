import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AgreementNav } from "../AgreementNav";
import { QaClient } from "../AgreementClients";

export const dynamic = "force-dynamic";

export default async function AgreementQa({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ag = await prisma.agreement.findUnique({ where: { id }, include: { _count: { select: { clauses: true } } } });
  if (!ag) notFound();
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{ag.title} — Q&amp;A</h1>
      <AgreementNav id={id} active="Q&A" />
      <p className="text-sm text-zinc-400 mb-3">Ask questions about this agreement. Answers come from the document text and extracted clauses, with citations where possible. <strong className="text-white">Not legal advice.</strong>{ag._count.clauses === 0 ? " Tip: run clause extraction (Risks tab) for better answers." : ""}</p>
      <QaClient agreementId={id} />
    </div>
  );
}
