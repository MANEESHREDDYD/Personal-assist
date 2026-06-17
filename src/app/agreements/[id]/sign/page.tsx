import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { canRecipientSign } from "@/lib/agreements/signing";
import type { RecipientDef } from "@/lib/agreements/types";
import { AgreementNav } from "../AgreementNav";
import { SignBlock } from "../AgreementClients";

export const dynamic = "force-dynamic";

export default async function SignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ag = await prisma.agreement.findUnique({ where: { id }, include: { recipients: { orderBy: { routingOrder: "asc" } }, fields: true } });
  if (!ag) notFound();
  const recipDefs: RecipientDef[] = ag.recipients.map((r) => ({ id: r.id, name: r.name, routingOrder: r.routingOrder, required: r.required, status: r.status as RecipientDef["status"] }));
  const prepared = ag.status !== "draft";

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{ag.title} — Local signing</h1>
      <AgreementNav id={id} active="Sign" />
      {!prepared ? (
        <div className="glass-card rounded-2xl p-10 text-center"><p className="text-zinc-400">Prepare the agreement first (add recipients + a signature field), then open local signing.</p></div>
      ) : (
        <div className="space-y-4">
          {ag.recipients.map((r) => {
            const fields = ag.fields.filter((f) => f.recipientId === r.id);
            const blocked = canRecipientSign(recipDefs, r.id);
            return (
              <section key={r.id} className="glass-card rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="font-bold text-white text-sm">{r.routingOrder}. {r.name}{r.role ? ` (${r.role})` : ""}</h2>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-white/10 text-zinc-300">{r.status}</span>
                </div>
                {r.status === "signed" ? <p className="text-xs text-green-400">Signed{r.signedAt ? ` at ${r.signedAt.toLocaleString()}` : ""}.</p>
                  : r.status === "declined" ? <p className="text-xs text-red-400">Declined.</p>
                  : fields.length === 0 ? <p className="text-xs text-zinc-500">No fields assigned to this recipient.</p>
                  : <SignBlock agreementId={id} recipientId={r.id} fields={fields.map((f) => ({ id: f.id, type: f.type, label: f.label, required: f.required, value: f.value }))} canSign={blocked === null} />}
                {blocked && r.status === "pending" && <p className="text-[11px] text-amber-400 mt-2">{blocked}</p>}
              </section>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-zinc-500 mt-4 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Local signing simulation — typed signatures captured locally. Not legally binding, not a DocuSign replacement. No email is sent.</p>
    </div>
  );
}
