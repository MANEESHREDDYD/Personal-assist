import Link from "next/link";
import { Bot } from "lucide-react";
import { CommandInput } from "../CommandInput";

export const dynamic = "force-dynamic";

export default function NewSchedulingPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Bot className="text-blue-400" /> New scheduling request
        </h1>
        <p className="text-zinc-400">
          Describe the meeting in plain language. Back to <Link href="/assistant/scheduling" className="text-blue-400 hover:underline">all conversations</Link>.
        </p>
      </div>
      <CommandInput />
    </div>
  );
}
