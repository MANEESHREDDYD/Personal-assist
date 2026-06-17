import Link from "next/link";
import { LayoutTemplate, ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { SeedButton, UseTemplateButton } from "./TemplatesClient";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const templates = await prisma.agreementTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <Link href="/agreements" className="text-sm text-zinc-400 hover:text-white flex items-center gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> Agreements</Link>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <h1 className="text-3xl font-bold text-white flex items-center gap-2"><LayoutTemplate className="text-blue-400" /> Agreement Templates</h1>
        <SeedButton />
      </div>
      {templates.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center"><p className="text-zinc-400">No templates yet. Click <strong>Load starter templates</strong> to add local NDA and service-agreement scaffolds.</p></div>
      ) : (
        <ul className="space-y-2">
          {templates.map((t) => (
            <li key={t.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-2">
              <div><div className="font-medium text-white text-sm">{t.title}</div><div className="text-xs text-zinc-400">{t.description}</div></div>
              <UseTemplateButton id={t.id} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-zinc-500 mt-6">Templates are local scaffolds for a signing simulation — not legal advice.</p>
    </div>
  );
}
