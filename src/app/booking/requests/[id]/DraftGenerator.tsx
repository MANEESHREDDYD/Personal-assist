"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2 } from "lucide-react";
import { generateBookingDraft } from "@/app/actions/booking";

export function DraftGenerator({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function gen(kind: "confirmation" | "reminder" | "follow_up") {
    startTransition(async () => { await generateBookingDraft(requestId, kind); router.refresh(); });
  }
  return (
    <div className="flex flex-wrap gap-2">
      {(["confirmation", "reminder", "follow_up"] as const).map((k) => (
        <button key={k} onClick={() => gen(k)} disabled={pending} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs flex items-center gap-1 disabled:opacity-50">
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />} Generate {k.replace("_", " ")} draft
        </button>
      ))}
    </div>
  );
}
