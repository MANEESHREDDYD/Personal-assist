"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveRole } from "@/app/actions/roles";
import { ROLES, ROLE_GROUPS, ROLE_IDS, type RoleId } from "@/lib/roles/registry";
import { RoleIcon } from "@/components/roles/RoleIcon";
import { CheckCircle2 } from "lucide-react";

export function RoleSelectClient({ activeRole }: { activeRole: RoleId }) {
  const router = useRouter();
  const [selected, setSelected] = useState<RoleId>(activeRole);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function choose(role: RoleId) {
    setSelected(role);
    setSaved(false);
    startTransition(async () => {
      const res = await setActiveRole(role);
      if (res.success) {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      {ROLE_GROUPS.map((group) => (
        <div key={group.id}>
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 font-bold mb-3">{group.label}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLE_IDS.filter((id) => ROLES[id].group === group.id).map((id) => {
              const role = ROLES[id];
              const isActive = selected === id;
              return (
                <button
                  key={id}
                  onClick={() => choose(id)}
                  disabled={pending}
                  className={`text-left p-4 rounded-xl border transition-all disabled:opacity-60 ${
                    isActive
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/10 bg-white/5 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <RoleIcon name={role.icon} className="w-5 h-5 text-blue-400" />
                      <span className="font-bold text-white">{role.label}</span>
                    </div>
                    {isActive && <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                  </div>
                  <p className="text-xs text-zinc-400">{role.tagline}</p>
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <p className="text-xs text-zinc-500">
        {pending ? "Saving role…" : saved ? "Role updated. Your dashboard and commands now adapt to this role." : "Pick a role to adapt the dashboard, quick actions, and command suggestions."}
      </p>
    </div>
  );
}
