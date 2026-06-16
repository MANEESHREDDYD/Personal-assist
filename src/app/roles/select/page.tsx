import { Layers } from "lucide-react";
import { RoleSelectClient } from "../RoleSelectClient";
import { getActiveRole } from "@/app/actions/roles";

export const dynamic = "force-dynamic";

export default async function RoleSelectPage() {
  const activeRole = await getActiveRole();
  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Layers className="text-blue-400" /> Select your role
        </h1>
        <p className="text-zinc-400">
          Personal Assist OS adapts to how you work. Choose the role that fits you best — you can
          change it anytime in Settings → Role Profile.
        </p>
      </div>
      <RoleSelectClient activeRole={activeRole} />
    </div>
  );
}
