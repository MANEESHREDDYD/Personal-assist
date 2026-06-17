import Link from "next/link";
import { FileSignature } from "lucide-react";
import { AgreementsClient } from "../AgreementsClient";

export const dynamic = "force-dynamic";

export default function NewAgreementPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><FileSignature className="text-blue-400" /> New agreement</h1>
        <p className="text-zinc-400">Create a local agreement, or start from a <Link href="/agreements/templates" className="text-blue-400 hover:underline">template</Link>.</p>
      </div>
      <AgreementsClient />
    </div>
  );
}
