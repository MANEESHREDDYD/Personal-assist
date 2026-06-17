import Link from "next/link";

const TABS = [
  { seg: "", label: "Overview" },
  { seg: "/prepare", label: "Prepare" },
  { seg: "/sign", label: "Sign" },
  { seg: "/risks", label: "Risks" },
  { seg: "/qa", label: "Q&A" },
  { seg: "/certificate", label: "Certificate" },
];

export function AgreementNav({ id, active }: { id: string; active: string }) {
  return (
    <div className="flex gap-1 flex-wrap border-b border-white/10 mb-6 text-sm">
      {TABS.map((t) => (
        <Link key={t.seg} href={`/agreements/${id}${t.seg}`} className={`px-3 py-2 border-b-2 ${active === t.label ? "border-blue-500 text-blue-400" : "border-transparent text-zinc-400 hover:text-white"}`}>{t.label}</Link>
      ))}
    </div>
  );
}
