import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AgreementNav } from "../AgreementNav";
import { PrepareForms } from "../AgreementClients";

export const dynamic = "force-dynamic";

export default async function PreparePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ag = await prisma.agreement.findUnique({ where: { id }, include: { recipients: { orderBy: { routingOrder: "asc" } }, fields: true } });
  if (!ag) notFound();
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{ag.title} — Prepare</h1>
      <AgreementNav id={id} active="Prepare" />
      <PrepareForms agreementId={id} recipients={ag.recipients.map((r) => ({ id: r.id, name: r.name }))} />

      {ag.fields.length > 0 && (
        <section className="glass-card rounded-xl p-4 mt-4">
          <h2 className="font-bold text-white text-sm mb-2">Placed fields</h2>
          <ul className="text-sm text-zinc-300 space-y-1">
            {ag.fields.map((f) => {
              const r = ag.recipients.find((x) => x.id === f.recipientId);
              return <li key={f.id} className="flex justify-between"><span>{f.type}{f.label ? ` · ${f.label}` : ""}</span><span className="text-xs text-zinc-500">{r ? r.name : "unassigned"}{f.required ? " · required" : ""}</span></li>;
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
