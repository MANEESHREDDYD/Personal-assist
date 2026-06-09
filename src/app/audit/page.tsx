import { prisma } from "@/lib/prisma";
import { ShieldAlert } from "lucide-react";
import { AuditClient } from "./AuditClient";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100, // Show last 100 for MVP
  });

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <ShieldAlert className="text-red-400" />
          Audit Log
        </h1>
        <p className="text-zinc-400">Record of all critical system actions.</p>
      </div>

      <AuditClient initialLogs={logs} />
    </div>
  );
}
