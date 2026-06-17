import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProjectNav } from "../ProjectNav";
import { DocumentLinker } from "../ProjectClients";

export const dynamic = "force-dynamic";

export default async function ProjectDocuments({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id }, include: { documents: { orderBy: { createdAt: "desc" } } } });
  if (!project) notFound();
  const localDocs = await prisma.document.findMany({ orderBy: { createdAt: "desc" }, take: 50, select: { id: true, originalName: true } });

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-white mb-4">{project.title} — Documents</h1>
      <ProjectNav id={id} active="Documents" />
      <p className="text-sm text-zinc-400 mb-3">Link local documents and notes to this project. Document intelligence (deadlines/action items) lives under <Link href="/documents" className="text-blue-400 hover:underline">Documents</Link>.</p>
      <DocumentLinker projectId={id} documents={localDocs.map((d) => ({ id: d.id, name: d.originalName }))} />
      <div className="mt-5">
        {project.documents.length === 0 ? <p className="text-sm text-zinc-500">No documents linked yet.</p> : (
          <ul className="space-y-2">
            {project.documents.map((d) => (
              <li key={d.id} className="glass-card rounded-lg p-3 text-sm flex items-center justify-between">
                <span className="text-zinc-200">{d.title}{d.notes ? <span className="text-zinc-500"> — {d.notes}</span> : ""}</span>
                {d.documentId && <Link href={`/documents/${d.documentId}`} className="text-xs text-blue-400 hover:underline">Open doc</Link>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
