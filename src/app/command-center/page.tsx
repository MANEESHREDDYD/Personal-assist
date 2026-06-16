import Link from "next/link";
import { Command } from "lucide-react";
import { CommandCenterClient } from "./CommandCenterClient";
import { ROLES } from "@/lib/roles/registry";
import { getActiveRole } from "@/app/actions/roles";

export const dynamic = "force-dynamic";

export default async function CommandCenterPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; cmd?: string }>;
}) {
  const sp = await searchParams;
  const activeRole = await getActiveRole();
  const role = sp.role && sp.role in ROLES ? (sp.role as keyof typeof ROLES) : activeRole;
  const def = ROLES[role];

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Command className="text-blue-400" /> Command Center
        </h1>
        <p className="text-zinc-400">
          One place to ask Personal Assist OS for help. Currently acting as <strong className="text-white">{def.label}</strong>.
          Switch roles in <Link href="/roles/select" className="text-blue-400 hover:underline">Roles</Link>.
        </p>
      </div>
      <CommandCenterClient role={role} initialCommand={sp.cmd} />
    </div>
  );
}
