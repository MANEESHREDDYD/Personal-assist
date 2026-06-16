import Link from "next/link";
import { UserCog } from "lucide-react";
import { ROLES } from "@/lib/roles/registry";
import { RoleIcon } from "@/components/roles/RoleIcon";
import { getActiveRole, listRoleProfiles } from "@/app/actions/roles";

export const dynamic = "force-dynamic";

export default async function RoleProfilePage() {
  const activeRole = await getActiveRole();
  const active = ROLES[activeRole];
  const profiles = await listRoleProfiles();

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <UserCog className="text-blue-400" /> Role Profile
        </h1>
        <p className="text-zinc-400">Manage how Personal Assist OS adapts to you. You can switch roles anytime.</p>
      </div>

      <div className="glass-card rounded-2xl p-6 mb-6 border border-blue-500/20 bg-blue-500/5">
        <p className="text-xs uppercase tracking-wider text-blue-400 font-bold mb-2">Current role</p>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <RoleIcon name={active.icon} className="w-6 h-6 text-blue-400" />
            <div>
              <h2 className="text-lg font-bold text-white">{active.label}</h2>
              <p className="text-sm text-zinc-400">{active.tagline}</p>
            </div>
          </div>
          <Link href="/roles/select" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            Change role
          </Link>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-3">Roles you have used</h3>
        {profiles.length === 0 ? (
          <p className="text-sm text-zinc-500">No roles activated yet. Pick one in <Link href="/roles/select" className="text-blue-400 hover:underline">Select your role</Link>.</p>
        ) : (
          <ul className="space-y-2">
            {profiles.map((p) => {
              const def = ROLES[p.role as keyof typeof ROLES];
              return (
                <li key={p.id} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-zinc-200">
                    {def && <RoleIcon name={def.icon} className="w-4 h-4 text-blue-400" />}
                    {def ? def.label : p.role}
                  </span>
                  {p.isActive && <span className="text-[10px] text-green-400 uppercase tracking-wider font-bold">Active</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-500 mt-4">
        Personal Assist OS is local-first. Role data stays on this device. No emails are sent and no
        external calendars are written without your explicit approval.
      </p>
    </div>
  );
}
