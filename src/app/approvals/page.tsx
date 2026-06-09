import { prisma } from "@/lib/prisma";
import { CheckSquare, ShieldAlert } from "lucide-react";
import { processApproval, generateMockApproval } from "../actions/approvals";
import { parseMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const approvals = await prisma.approvalRequest.findMany({
    orderBy: { createdAt: "desc" },
  });

  const pending = approvals.filter(a => a.status === "pending");
  const completed = approvals.filter(a => a.status !== "pending");

  function renderRiskLevel(metadataStr: string | null) {
    const meta = parseMetadata(metadataStr);
    const risk = meta.riskLevel as string | undefined;
    
    if (!risk) return null;
    
    let colorClass = "bg-white/10 text-zinc-300 border-white/20";
    if (risk.toLowerCase() === "high") colorClass = "bg-red-500/10 text-red-500 border-red-500/20";
    if (risk.toLowerCase() === "medium") colorClass = "bg-orange-500/10 text-orange-500 border-orange-500/20";
    if (risk.toLowerCase() === "low") colorClass = "bg-green-500/10 text-green-500 border-green-500/20";

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border flex items-center gap-1 w-fit ${colorClass}`}>
        {risk.toLowerCase() === "high" && <ShieldAlert className="w-3 h-3" />}
        Risk: {risk}
      </span>
    );
  }

  async function handleGenerateMock() {
    "use server";
    await generateMockApproval();
  }

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <CheckSquare className="text-purple-400" />
            Approval Center
          </h1>
          <p className="text-zinc-400">Review and approve actions proposed by Personal Assist.</p>
        </div>
        <form action={handleGenerateMock}>
          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-bold hover:opacity-90 transition-opacity">
            Generate Mock Request
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Pending Approvals ({pending.length})</h2>
        {pending.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-zinc-400">
            No pending approvals.
          </div>
        ) : (
          <div className="space-y-4">
            {pending.map((req) => (
              <div key={req.id} className="glass-card rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4 border-l-yellow-500">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-500">
                      {req.status}
                    </span>
                    {renderRiskLevel(req.metadata)}
                  </div>
                  <h3 className="font-semibold text-white mb-1">Action: {req.actionType}</h3>
                  <p className="text-sm text-zinc-400">{req.description}</p>
                  
                  {(() => {
                    const meta = parseMetadata(req.metadata);
                    return (
                      <div className="flex gap-4 mt-2">
                        {meta.documentId && (
                          <a href={`/documents/${meta.documentId}`} className="text-xs text-blue-400 hover:underline">View Source Document</a>
                        )}
                        {meta.draftId && (
                          <a href={`/drafts`} className="text-xs text-blue-400 hover:underline">View Local Draft</a>
                        )}
                      </div>
                    );
                  })()}

                  <p className="text-xs text-zinc-500 mt-2">{new Date(req.createdAt).toLocaleString()}</p>
                </div>
                
                <div className="flex flex-wrap gap-2 shrink-0">
                  <form action={async () => {
                    "use server";
                    await processApproval(req.id, "approved");
                  }}>
                    <button className="px-4 py-2 bg-green-500/20 text-green-400 text-sm font-bold rounded-xl hover:bg-green-500/30 transition-colors border border-green-500/20">
                      Approve
                    </button>
                  </form>
                  <form action={async () => {
                    "use server";
                    await processApproval(req.id, "needs_changes");
                  }}>
                    <button className="px-4 py-2 bg-orange-500/20 text-orange-400 text-sm font-bold rounded-xl hover:bg-orange-500/30 transition-colors border border-orange-500/20">
                      Needs Changes
                    </button>
                  </form>
                  <form action={async () => {
                    "use server";
                    await processApproval(req.id, "denied");
                  }}>
                    <button className="px-4 py-2 bg-red-500/20 text-red-400 text-sm font-bold rounded-xl hover:bg-red-500/30 transition-colors border border-red-500/20">
                      Deny
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Completed Approvals ({completed.length})</h2>
        {completed.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-zinc-400">
            No completed approvals yet.
          </div>
        ) : (
          <div className="space-y-4">
            {completed.map((req) => (
              <div key={req.id} className="glass-card rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-75">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      req.status === "approved" ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                    }`}>
                      {req.status}
                    </span>
                    {renderRiskLevel(req.metadata)}
                  </div>
                  <h3 className="font-semibold text-white mb-1">Action: {req.actionType}</h3>
                  <p className="text-sm text-zinc-400">{req.description}</p>
                  
                  {(() => {
                    const meta = parseMetadata(req.metadata);
                    return (
                      <div className="flex gap-4 mt-2">
                        {meta.documentId && (
                          <a href={`/documents/${meta.documentId}`} className="text-xs text-blue-400 hover:underline">View Source Document</a>
                        )}
                        {meta.draftId && (
                          <div className="space-y-1">
                            <div className="flex gap-4">
                              <a href={`/drafts`} className="text-xs text-blue-400 hover:underline">Open Draft</a>
                              {req.status === "approved" && (
                                <>
                                  <a href={`/drafts`} className="text-xs text-purple-400 hover:underline font-bold">Export Manually</a>
                                  <a href={`/drafts`} className="text-xs text-amber-400 hover:underline font-bold">Create Provider Draft</a>
                                </>
                              )}
                            </div>
                            {req.status === "approved" && (
                              <p className="text-[10px] text-orange-400 mt-1 uppercase tracking-wider">After approval: create a Gmail/Outlook draft, attach documents to the provider draft, or export manually. Personal Assist still never sends — review and send yourself.</p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <p className="text-xs text-zinc-500 mt-2">{new Date(req.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
