import Link from "next/link";
import { FolderPlus } from "lucide-react";
import { ProjectsClient } from "../ProjectsClient";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2"><FolderPlus className="text-blue-400" /> New project</h1>
        <p className="text-zinc-400">Describe a goal to auto-decompose it, or create one manually. Back to <Link href="/projects" className="text-blue-400 hover:underline">all projects</Link>.</p>
      </div>
      <ProjectsClient />
    </div>
  );
}
