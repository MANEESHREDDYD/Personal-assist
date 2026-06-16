import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Sparkles, Workflow, Terminal } from "lucide-react";
import { ROLES, isRoleId } from "@/lib/roles/registry";
import { RoleIcon } from "@/components/roles/RoleIcon";
import { getActiveRole, setActiveRole } from "@/app/actions/roles";

export const dynamic = "force-dynamic";

export default async function RoleDashboardPage({ params }: { params: Promise<{ role: string }> }) {
  const { role } = await params;
  if (!isRoleId(role)) notFound();
  const def = ROLES[role];
  const activeRole = await getActiveRole();
  const isActive = activeRole === role;

  async function makeActive() {
    "use server";
    await setActiveRole(role);
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <RoleIcon name={def.icon} className="w-7 h-7 text-blue-400" />
          <h1 className="text-3xl font-bold text-white">{def.label}</h1>
          {isActive ? (
            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">Active role</span>
          ) : (
            <form action={makeActive}>
              <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-full">Make active</button>
            </form>
          )}
        </div>
        <p className="text-zinc-400 max-w-2xl">{def.summary}</p>
      </div>

      {/* Quick actions */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-purple-400" /> Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          {def.quickActions.map((qa) => (
            <Link
              key={qa.label}
              href={`/command-center?role=${def.id}&cmd=${encodeURIComponent(qa.command)}`}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-zinc-200"
            >
              {qa.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Dashboard cards */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-white mb-3">Workspaces</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {def.dashboardCards.map((card) => {
            const inner = (
              <>
                <div className="font-semibold text-white flex items-center justify-between">
                  {card.title}
                  {card.href && <ArrowRight className="w-4 h-4 text-zinc-500" />}
                </div>
                <p className="text-xs text-zinc-400 mt-1">{card.description}</p>
              </>
            );
            return card.href ? (
              <Link key={card.title} href={card.href} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/30 transition-all">
                {inner}
              </Link>
            ) : (
              <div key={card.title} className="p-4 rounded-xl bg-white/5 border border-white/10">{inner}</div>
            );
          })}
        </div>
      </section>

      {/* Workflows */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Workflow className="w-4 h-4 text-blue-400" /> Local AI workflows</h2>
        <div className="space-y-2">
          {def.workflows.map((wf) => (
            <div key={wf.name} className="p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="font-medium text-white text-sm">{wf.name}</div>
              <p className="text-xs text-zinc-400">{wf.description}</p>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">
          Workflows generate local drafts, plans, and checklists only. Nothing is sent and no external
          calendar is written without your explicit approval.
        </p>
      </section>

      {/* Command suggestions */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><Terminal className="w-4 h-4 text-green-400" /> Try in the Command Center</h2>
        <div className="flex flex-wrap gap-2">
          {def.commandSuggestions.map((cmd) => (
            <Link
              key={cmd}
              href={`/command-center?role=${def.id}&cmd=${encodeURIComponent(cmd)}`}
              className="px-3 py-1.5 bg-black/30 border border-white/10 rounded-full text-xs text-zinc-300 hover:text-white hover:border-white/30"
            >
              {cmd}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
