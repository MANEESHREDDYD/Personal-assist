import Link from "next/link";
import { Layers, ArrowRight } from "lucide-react";
import { ROLES, ROLE_GROUPS, ROLE_IDS } from "@/lib/roles/registry";
import { RoleIcon } from "@/components/roles/RoleIcon";
import { getActiveRole } from "@/app/actions/roles";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const activeRole = await getActiveRole();
  const active = ROLES[activeRole];

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Layers className="text-blue-400" /> Personal Assist OS — Roles
        </h1>
        <p className="text-zinc-400">
          One local-first platform that adapts to your role. Switch roles anytime to change your
          dashboard, quick actions, workflows, and command suggestions.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 mb-8 border border-blue-500/20 bg-blue-500/5">
        <p className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-2">Active role</p>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <RoleIcon name={active.icon} className="w-7 h-7 text-blue-400" />
            <div>
              <h2 className="text-xl font-bold text-white">{active.label}</h2>
              <p className="text-sm text-zinc-400">{active.tagline}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/roles/${active.id}`} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center gap-1">
              Open dashboard <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/roles/select" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium">
              Switch role
            </Link>
          </div>
        </div>
      </div>

      {ROLE_GROUPS.map((group) => (
        <div key={group.id} className="mb-6">
          <h3 className="text-sm uppercase tracking-wider text-zinc-500 font-bold mb-3">{group.label}</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLE_IDS.filter((id) => ROLES[id].group === group.id).map((id) => {
              const role = ROLES[id];
              return (
                <Link
                  key={id}
                  href={`/roles/${id}`}
                  className={`p-4 rounded-xl border transition-all ${
                    id === activeRole ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <RoleIcon name={role.icon} className="w-5 h-5 text-blue-400" />
                    <span className="font-bold text-white">{role.label}</span>
                  </div>
                  <p className="text-xs text-zinc-400">{role.summary}</p>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
