import Link from "next/link";

const TABS = [
  { seg: "", label: "Overview" },
  { seg: "/plan", label: "Plan" },
  { seg: "/tasks", label: "Tasks" },
  { seg: "/risks", label: "Risks" },
  { seg: "/workload", label: "Workload" },
  { seg: "/status", label: "Status" },
  { seg: "/documents", label: "Documents" },
];

export function ProjectNav({ id, active }: { id: string; active: string }) {
  return (
    <div className="flex gap-1 flex-wrap border-b border-white/10 mb-6 text-sm">
      {TABS.map((t) => (
        <Link key={t.seg} href={`/projects/${id}${t.seg}`} className={`px-3 py-2 border-b-2 ${active === t.label ? "border-blue-500 text-blue-400" : "border-transparent text-zinc-400 hover:text-white"}`}>{t.label}</Link>
      ))}
    </div>
  );
}
