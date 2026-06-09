import { prisma } from "@/lib/prisma";
import { FileText, Upload } from "lucide-react";
import Link from "next/link";
import { DocumentUploadForm } from "./DocumentUploadForm";
import { DocumentActions } from "./DocumentActions";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <FileText className="text-blue-400" />
            Documents
          </h1>
          <p className="text-zinc-400">Manage your uploaded files and documents.</p>
        </div>
        
        {/* Upload Form Component */}
        <DocumentUploadForm />
      </div>

      {documents.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <FileText className="w-16 h-16 text-zinc-600 mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No documents found</h3>
          <p className="text-zinc-400 mb-6 max-w-md">
            Upload your first document above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="glass-card rounded-2xl p-5 relative group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-xl bg-blue-400/10 text-blue-400">
                  <FileText className="w-6 h-6" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-white mb-1 truncate" title={doc.originalName}>
                {doc.originalName}
              </h3>
              <p className="text-sm text-zinc-400 mb-4 font-mono">
                {(doc.size / 1024).toFixed(1)} KB • {doc.mimeType}
              </p>
              
              {doc.aiSummary && (
                <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/5 text-sm text-zinc-300">
                  <span className="text-purple-400 font-bold block mb-1 text-xs">AI Summary</span>
                  {doc.aiSummary}
                </div>
              )}

              <div className="flex justify-between items-center mt-4">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
                  doc.status.toLowerCase().includes('needs') 
                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    : 'bg-green-500/10 text-green-500 border-green-500/20'
                }`}>
                  {doc.status.replace("_", " ")}
                </span>
                <a
                  href={doc.path}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-zinc-400 hover:text-white font-medium"
                >
                  Raw File
                </a>
              </div>

              <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                 <Link 
                    href={`/documents/${doc.id}`}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition-colors"
                 >
                    View Document Workspace
                 </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
