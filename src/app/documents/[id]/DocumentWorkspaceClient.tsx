"use client";

import { useState } from "react";
import { FileText, CheckCircle, Clock, XCircle, PenTool, GitMerge, FileSignature, Play, Plus, Trash2, Send } from "lucide-react";
import { generateDocumentEdit, acceptDocumentEdit, rejectDocumentEdit } from "@/app/actions/documentEdits";
import { addSigner, removeSigner, addSignatureField, createMockSigningRequest, simulateSignerViewed, simulateSignerSigned, simulateSignerDeclined } from "@/app/actions/signing";
import { generateMockApproval } from "@/app/actions/approvals";

interface Props {
  document: any;
  versions: any[];
  signers: any[];
  fields: any[];
}

export function DocumentWorkspaceClient({ document, versions, signers, fields }: Props) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // New Signer State
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  
  // New Field State
  const [newFieldSigner, setNewFieldSigner] = useState("");
  const [newFieldType, setNewFieldType] = useState("signature");

  const latestVersion = versions.length > 0 ? versions[0] : null;

  async function handleEditAction(actionType: string) {
    setLoadingAction(actionType);
    await generateDocumentEdit(document.id, actionType);
    setLoadingAction(null);
    setActiveTab("redline");
  }

  async function handleAcceptReject(action: "accept" | "reject", versionId: string) {
    setLoadingAction(versionId);
    if (action === "accept") await acceptDocumentEdit(document.id, versionId);
    else await rejectDocumentEdit(document.id, versionId);
    setLoadingAction(null);
  }

  async function handleAddSigner() {
    if (!newSignerName || !newSignerEmail) return;
    setLoadingAction("add_signer");
    await addSigner(document.id, newSignerName, newSignerEmail, "Signer", signers.length + 1);
    setNewSignerName("");
    setNewSignerEmail("");
    setLoadingAction(null);
  }

  async function handleRemoveSigner(id: string) {
    setLoadingAction(`remove_${id}`);
    await removeSigner(document.id, id);
    setLoadingAction(null);
  }

  async function handleAddField() {
    if (!newFieldSigner) return;
    setLoadingAction("add_field");
    await addSignatureField(document.id, newFieldSigner, newFieldType, `${newFieldType} Field`);
    setLoadingAction(null);
  }

  async function handleSendForSignature() {
    setLoadingAction("send_signature");
    await createMockSigningRequest(document.id);
    setLoadingAction(null);
  }

  async function handleSimulateSignerEvent(signerId: string, event: "view" | "sign" | "decline") {
    setLoadingAction(`simulate_${event}_${signerId}`);
    if (event === "view") await simulateSignerViewed(signerId, document.id);
    if (event === "sign") await simulateSignerSigned(signerId, document.id);
    if (event === "decline") await simulateSignerDeclined(signerId, document.id);
    setLoadingAction(null);
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: <FileText className="w-4 h-4" /> },
    { id: "versions", label: "Versions", icon: <Clock className="w-4 h-4" /> },
    { id: "edit", label: "Edit Studio", icon: <PenTool className="w-4 h-4" /> },
    { id: "redline", label: "Redline", icon: <GitMerge className="w-4 h-4" /> },
    { id: "signers", label: "Signers & Fields", icon: <FileSignature className="w-4 h-4" /> },
  ];

  return (
    <div className="w-full">
      <div className="flex border-b border-white/10 mb-6 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 font-medium text-sm flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? "border-blue-500 text-blue-400" 
                : "border-transparent text-zinc-400 hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[500px]">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Document Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-zinc-500">File Name:</span> <span className="text-white">{document.originalName}</span></div>
                <div><span className="text-zinc-500">Status:</span> <span className="text-white">{document.status}</span></div>
                <div><span className="text-zinc-500">Size:</span> <span className="text-white">{(document.size / 1024).toFixed(1)} KB</span></div>
                <div><span className="text-zinc-500">Type:</span> <span className="text-white">{document.mimeType}</span></div>
              </div>
            </div>

            {document.aiSummary && (
              <div className="glass-card rounded-2xl p-6 border-l-4 border-l-purple-500">
                <h3 className="text-lg font-bold text-purple-400 mb-2">AI Summary</h3>
                <p className="text-zinc-300">{document.aiSummary}</p>
              </div>
            )}
            
            <div className="glass-card rounded-2xl p-6">
               <h3 className="text-lg font-bold text-white mb-4">Latest Content</h3>
               <div className="bg-black/30 p-4 rounded-lg text-zinc-300 whitespace-pre-wrap text-sm border border-white/5 h-64 overflow-y-auto">
                  {latestVersion?.content || "No extracted text available yet."}
               </div>
            </div>
          </div>
        )}

        {activeTab === "versions" && (
          <div className="space-y-4">
            {versions.map((v: any) => (
              <div key={v.id} className="p-4 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-white font-bold">v{v.versionNumber} - {v.title}</h4>
                  <span className="text-xs text-zinc-500">{new Date(v.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">{v.type}</span>
                  <span className="px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">{v.createdBy}</span>
                </div>
                {v.content && (
                  <details className="mt-2 text-sm text-zinc-400">
                    <summary className="cursor-pointer hover:text-white">View Content</summary>
                    <div className="mt-2 p-3 bg-black/40 rounded whitespace-pre-wrap">{v.content}</div>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "edit" && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
               <h3 className="text-lg font-bold text-white mb-4">Local AI Actions</h3>
               <p className="text-zinc-400 text-sm mb-6">These operations run fully locally using your configured AI Provider to modify or extract the document text.</p>
               
               <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                 {[
                   { id: "make_professional", label: "Make Professional" },
                   { id: "make_shorter", label: "Make Shorter" },
                   { id: "make_clearer", label: "Make Clearer" },
                   { id: "extract_obligations", label: "Extract Obligations" },
                   { id: "extract_payment_terms", label: "Extract Payment Terms" },
                   { id: "find_risks", label: "Find Risky Clauses" }
                 ].map(action => (
                   <button
                     key={action.id}
                     disabled={loadingAction !== null}
                     onClick={() => handleEditAction(action.id)}
                     className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium text-sm flex items-center justify-between disabled:opacity-50 transition-colors"
                   >
                     {action.label}
                     {loadingAction === action.id ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Play className="w-4 h-4 text-blue-400" />}
                   </button>
                 ))}
               </div>
            </div>
          </div>
        )}

        {activeTab === "redline" && (
          <div className="space-y-4">
             {versions.filter((v: any) => v.metadata && JSON.parse(v.metadata).status === 'proposed').map((v: any) => (
                <div key={v.id} className="p-5 rounded-xl border border-blue-500/30 bg-blue-500/5">
                   <div className="flex justify-between items-start mb-4">
                      <div>
                         <h4 className="text-white font-bold">{v.title}</h4>
                         <p className="text-sm text-zinc-400">Proposed change generated by AI</p>
                      </div>
                      <div className="flex gap-2">
                         <button 
                            disabled={loadingAction === v.id}
                            onClick={() => handleAcceptReject("accept", v.id)}
                            className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm font-medium flex items-center gap-2"
                         >
                            <CheckCircle className="w-4 h-4" /> Accept
                         </button>
                         <button 
                            disabled={loadingAction === v.id}
                            onClick={() => handleAcceptReject("reject", v.id)}
                            className="px-3 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium flex items-center gap-2"
                         >
                            <XCircle className="w-4 h-4" /> Reject
                         </button>
                      </div>
                   </div>
                   <div className="bg-black/40 p-4 rounded-lg text-zinc-300 whitespace-pre-wrap text-sm border border-white/5">
                      {v.content}
                   </div>
                </div>
             ))}
             {versions.filter((v: any) => v.metadata && JSON.parse(v.metadata).status === 'proposed').length === 0 && (
                <div className="text-center p-8 text-zinc-500">No proposed edits to review. Head to Edit Studio to generate some.</div>
             )}
          </div>
        )}

        {activeTab === "signers" && (
          <div className="space-y-6">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
               <h4 className="text-yellow-500 font-bold mb-1">Local Simulation Only</h4>
               <p className="text-yellow-500/80 text-sm">This is a mock signature workflow. It does not send real emails or create legally binding e-signatures. It simulates the exact data flow for testing.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Signers Column */}
              <div className="glass-card rounded-2xl p-6">
                 <h3 className="text-lg font-bold text-white mb-4">Signers</h3>
                 
                 <div className="space-y-3 mb-6">
                   {signers.map(s => (
                     <div key={s.id} className="p-3 bg-white/5 border border-white/10 rounded-lg flex justify-between items-center">
                       <div>
                          <div className="font-bold text-white text-sm">{s.name} <span className="text-zinc-500 font-normal">({s.email})</span></div>
                          <div className="flex gap-2 items-center mt-1 text-xs">
                             <span className="text-zinc-400">Status: {s.status}</span>
                             {document.status === 'signature_requested' && s.status !== 'signed' && s.status !== 'declined' && (
                               <div className="flex gap-1 ml-2">
                                  <button onClick={() => handleSimulateSignerEvent(s.id, "view")} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30">View</button>
                                  <button onClick={() => handleSimulateSignerEvent(s.id, "sign")} className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30">Sign</button>
                                  <button onClick={() => handleSimulateSignerEvent(s.id, "decline")} className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">Decline</button>
                               </div>
                             )}
                          </div>
                       </div>
                       <button onClick={() => handleRemoveSigner(s.id)} className="text-red-400 hover:text-red-300 p-1"><Trash2 className="w-4 h-4" /></button>
                     </div>
                   ))}
                   {signers.length === 0 && <div className="text-zinc-500 text-sm">No signers added.</div>}
                 </div>

                 <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-bold text-zinc-300 mb-2">Add Signer</h4>
                    <div className="flex gap-2 flex-col">
                       <input value={newSignerName} onChange={e => setNewSignerName(e.target.value)} placeholder="Name" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                       <input value={newSignerEmail} onChange={e => setNewSignerEmail(e.target.value)} placeholder="Email" className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                       <button disabled={loadingAction === "add_signer"} onClick={handleAddSigner} className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium flex justify-center items-center gap-2">
                          <Plus className="w-4 h-4" /> Add Signer
                       </button>
                    </div>
                 </div>
              </div>

              {/* Fields Column */}
              <div className="glass-card rounded-2xl p-6">
                 <h3 className="text-lg font-bold text-white mb-4">Signature Fields</h3>
                 
                 <div className="space-y-3 mb-6">
                   {fields.map(f => {
                     const signer = signers.find(s => s.id === f.signerId);
                     return (
                       <div key={f.id} className="p-3 bg-white/5 border border-white/10 rounded-lg flex justify-between items-center">
                         <div>
                            <div className="font-bold text-white text-sm">{f.label} ({f.type})</div>
                            <div className="text-zinc-400 text-xs">Signer: {signer?.name || "Unknown"}</div>
                         </div>
                       </div>
                     );
                   })}
                   {fields.length === 0 && <div className="text-zinc-500 text-sm">No fields added.</div>}
                 </div>

                 <div className="pt-4 border-t border-white/10">
                    <h4 className="text-sm font-bold text-zinc-300 mb-2">Add Field</h4>
                    <div className="flex gap-2 flex-col">
                       <select value={newFieldSigner} onChange={e => setNewFieldSigner(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                          <option value="">Select Signer...</option>
                          {signers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                       </select>
                       <select value={newFieldType} onChange={e => setNewFieldType(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                          <option value="signature">Signature</option>
                          <option value="initials">Initials</option>
                          <option value="date">Date</option>
                       </select>
                       <button disabled={loadingAction === "add_field" || !newFieldSigner} onClick={handleAddField} className="w-full px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium flex justify-center items-center gap-2 disabled:opacity-50">
                          <Plus className="w-4 h-4" /> Add Field
                       </button>
                    </div>
                 </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
               <button 
                  disabled={loadingAction !== null || signers.length === 0 || fields.length === 0 || document.status === "completed"}
                  onClick={handleSendForSignature}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:opacity-90 transition-opacity font-bold flex items-center gap-2 disabled:opacity-50"
               >
                  <Send className="w-4 h-4" />
                  {document.status === "completed" ? "Signing Completed" : "Send Mock Signature Request"}
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
