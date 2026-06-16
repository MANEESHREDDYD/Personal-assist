"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { parseSchedulingInstruction } from "@/app/actions/schedulingSecretary";

export function ScheduleFromInbox({ itemId, command }: { itemId: string; command: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function go() {
    startTransition(async () => {
      const res = await parseSchedulingInstruction({ text: command, sourceType: "inbox_thread", sourceRef: itemId });
      if (res.success && res.id) router.push(`/assistant/scheduling/${res.id}`);
      else if (res.error) alert(res.error);
    });
  }
  return (
    <button onClick={go} disabled={pending} className="px-2.5 py-1 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded text-xs flex items-center gap-1 disabled:opacity-50">
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CalendarPlus className="w-3 h-3" />} Schedule from this email
    </button>
  );
}
