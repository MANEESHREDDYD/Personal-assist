"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FilePlus2, Download } from "lucide-react";
import { seedStarterTemplates, createFromTemplate } from "@/app/actions/agreements";

export function SeedButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button onClick={() => startTransition(async () => { await seedStarterTemplates(); router.refresh(); })} disabled={pending} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50">
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Load starter templates
    </button>
  );
}

export function UseTemplateButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button onClick={() => startTransition(async () => { const r = await createFromTemplate(id); if (r.success && r.id) router.push(`/agreements/${r.id}/prepare`); else if (r.error) alert(r.error); })} disabled={pending} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50">
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FilePlus2 className="w-3 h-3" />} Use template
    </button>
  );
}
