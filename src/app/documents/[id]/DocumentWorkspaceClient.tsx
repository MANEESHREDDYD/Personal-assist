"use client";

import { useState } from "react";
import { FileText, CheckCircle, Clock, XCircle, PenTool, GitMerge, FileSignature, Play, Plus, Trash2, Send, Brain, Calendar, Mail, FileWarning, Wallet, Bell, Loader2 } from "lucide-react";
import { generateDocumentEdit, acceptDocumentEdit, rejectDocumentEdit } from "@/app/actions/documentEdits";
import { addSigner, removeSigner, addSignatureField, createMockSigningRequest, simulateSignerViewed, simulateSignerSigned, simulateSignerDeclined } from "@/app/actions/signing";
import { generateMockApproval } from "@/app/actions/approvals";
import { 
  extractDocumentProperties, 
  generateDocumentDraft, 
  createExtractedReminder, 
  createExtractedFollowUp, 
  createExtractedWalletCard 
} from "@/app/actions/documentIntelligence";

interface Props {
  document: any;
  versions: any[];
  signers: any[];
  fields: any[];
  sourceInboxItem?: any;
  relatedDrafts?: any[];
  relatedCards?: any[];
  relatedFollowUps?: any[];
  relatedApprovals?: any[];
  metadataObj?: any;
}

export function DocumentWorkspaceClient({ document, versions, signers, fields, sourceInboxItem, relatedDrafts, relatedCards, relatedFollowUps, relatedApprovals, metadataObj }: Props) {
  const [activeTab, setActiveTab] = useState("overview");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // New Signer State
  const [newSignerName, setNewSignerName] = useState("");
  const [newSignerEmail, setNewSignerEmail] = useState("");
  
  // New Field State
  const [newFieldSigner, setNewFieldSigner] = useState("");
  const [newFieldType, setNewFieldType] = useState("signature");

  // Intelligence State
  const [extractedData, setExtractedData] = useState<any>({});
  
  async function handleExtract(property: any) {
    setLoadingAction(`extract_${property}`);
    const res = await extractDocumentProperties(document.id, property);
    if (res.success) {
      setExtractedData((prev: any) => ({ ...prev, [property]: res.result }));
    }
    setLoadingAction(null);
  }

  async function handleGenerateDraft(type: string) {
    setLoadingAction(`draft_${type}`);
    await generateDocumentDraft(document.id, type, sourceInboxItem?.id);
    setLoadingAction(null);
  }

  async function handleQuickAction(action: string, payload: any) {
    setLoadingAction(`quick_${action}`);
    if (action === "reminder") await createExtractedReminder(document.id, payload.date, payload.desc);
    if (action === "followup") await createExtractedFollowUp(document.id, payload.item);
    if (action === "wallet") await createExtractedWalletCard(document.id, payload.title, payload.content);
    setLoadingAction(null);
  }

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
    { id: "intelligence", label: "Intelligence", icon: <Brain className="w-4 h-4 text-purple-400" /> },
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
              <div className="flex justify-between items-start mb-4">
                 <h3 className="text-lg font-bold text-white">Document Details</h3>
                 <div className="flex gap-2">
                    <a 
                      href={`/api/documents/${document.id}/file`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Open File
                    </a>
                    <a 
                      href={`/api/documents/${document.id}/file`} 
                      download={document.originalName}
                      className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Download File
                    </a>
                 </div>
              </div>
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

        {activeTab === "intelligence" && (
          <div className="space-y-6">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-start gap-3">
              <Brain className="w-5 h-5 text-purple-400 mt-0.5" />
              <div>
                <h3 className="font-bold text-purple-400">Local Intelligence Beta</h3>
                <p className="text-sm text-purple-300">Document intelligence is local beta assistance, not legal or financial advice. Generated drafts are local only and are not sent. Attachments remain in private local storage. Review all generated content before using it externally.</p>
              </div>
            </div>

            {sourceInboxItem && (
              <div className="glass-card rounded-2xl p-6 border-l-4 border-l-blue-500">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-400" /> Source Email Context
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                  <div><span className="text-zinc-500">Subject:</span> <span className="text-white">{sourceInboxItem.subject}</span></div>
                  <div><span className="text-zinc-500">Sender:</span> <span className="text-white">{sourceInboxItem.sender}</span></div>
                  <div><span className="text-zinc-500">Source:</span> <span className="text-white">{metadataObj?.source || "Unknown"}</span></div>
                  <div>
                    <a href={`/inbox/${sourceInboxItem.id}`} className="text-blue-400 hover:underline">View Email</a>
                  </div>
                </div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Extractions Panel */}
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white mb-4">Insights & Extractions</h3>

                {/* Action Items */}
                <div className="glass-card p-5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-white flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-400" /> Action Items</h4>
                    <button onClick={() => handleExtract("action_items")} disabled={loadingAction === "extract_action_items"} className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded">
                      {loadingAction === "extract_action_items" ? "Extracting..." : "Extract"}
                    </button>
                  </div>
                  {extractedData.action_items ? (
                    <ul className="space-y-2 text-sm">
                      {extractedData.action_items.map((item: string, i: number) => (
                        <li key={i} className="flex justify-between items-start gap-2 bg-black/20 p-2 rounded">
                          <span className="text-zinc-300 flex-1">{item}</span>
                          <button onClick={() => handleQuickAction("followup", { item })} disabled={loadingAction?.startsWith("quick_")} className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 whitespace-nowrap">
                            Create Follow-Up
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-zinc-500">Not extracted yet.</p>}
                </div>

                {/* Deadlines */}
                <div className="glass-card p-5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-white flex items-center gap-2"><Calendar className="w-4 h-4 text-orange-400" /> Deadlines</h4>
                    <button onClick={() => handleExtract("deadlines")} disabled={loadingAction === "extract_deadlines"} className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded">
                      {loadingAction === "extract_deadlines" ? "Extracting..." : "Extract"}
                    </button>
                  </div>
                  {extractedData.deadlines ? (
                    <ul className="space-y-2 text-sm">
                      {extractedData.deadlines.map((d: any, i: number) => (
                        <li key={i} className="flex justify-between items-start gap-2 bg-black/20 p-2 rounded">
                          <div>
                            <div className="font-bold text-orange-300">{d.date}</div>
                            <div className="text-zinc-400 text-xs">{d.description}</div>
                          </div>
                          <button onClick={() => handleQuickAction("reminder", d)} disabled={loadingAction?.startsWith("quick_")} className="text-[10px] px-2 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 whitespace-nowrap">
                            Create Reminder
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-zinc-500">Not extracted yet.</p>}
                </div>

                {/* Parties */}
                <div className="glass-card p-5 rounded-xl border border-white/5">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-white flex items-center gap-2"><FileSignature className="w-4 h-4 text-indigo-400" /> Parties & Contacts</h4>
                    <button onClick={() => handleExtract("parties")} disabled={loadingAction === "extract_parties"} className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded">
                      {loadingAction === "extract_parties" ? "Extracting..." : "Extract"}
                    </button>
                  </div>
                  {extractedData.parties ? (
                    <ul className="space-y-2 text-sm">
                      {extractedData.parties.map((p: any, i: number) => (
                        <li key={i} className="bg-black/20 p-2 rounded flex items-center gap-2">
                          <span className="font-bold text-zinc-200">{p.name}</span>
                          <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{p.role}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-xs text-zinc-500">Not extracted yet.</p>}
                </div>

                {/* Terms & Risks */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-white text-sm">Payment Terms</h4>
                      <button onClick={() => handleExtract("payment_terms")} className="text-[10px] px-2 py-1 bg-white/10 rounded">Extract</button>
                    </div>
                    {extractedData.payment_terms ? <p className="text-xs text-zinc-300">{extractedData.payment_terms}</p> : <p className="text-[10px] text-zinc-500">Not extracted</p>}
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-white/5">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-bold text-white text-sm">Signatures</h4>
                      <button onClick={() => handleExtract("signatures")} className="text-[10px] px-2 py-1 bg-white/10 rounded">Extract</button>
                    </div>
                    {extractedData.signatures ? <p className="text-xs text-zinc-300">{extractedData.signatures}</p> : <p className="text-[10px] text-zinc-500">Not extracted</p>}
                  </div>
                </div>

                <div className="glass-card p-5 rounded-xl border border-red-500/20 bg-red-500/5">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-bold text-red-400 flex items-center gap-2"><FileWarning className="w-4 h-4" /> Risk Identification</h4>
                    <button onClick={() => handleExtract("risks")} disabled={loadingAction === "extract_risks"} className="text-xs px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded">
                      {loadingAction === "extract_risks" ? "Scanning..." : "Scan"}
                    </button>
                  </div>
                  {extractedData.risks ? (
                    <ul className="space-y-1 text-sm text-red-300 list-disc pl-4">
                      {extractedData.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
                    </ul>
                  ) : <p className="text-xs text-red-500/50">Not scanned yet.</p>}
                </div>
              </div>

              {/* Drafts & Related Panel */}
              <div className="space-y-6">
                <div className="glass-card rounded-2xl p-6 border border-white/10">
                  <h3 className="text-xl font-bold text-white mb-4">Draft Actions</h3>
                  <p className="text-sm text-zinc-400 mb-6">Generate local email drafts from this document. They will be stored securely and will not sync to your email provider until approved.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    <button onClick={() => handleGenerateDraft("reply")} disabled={loadingAction?.startsWith("draft_")} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 text-left transition-colors">
                      <div className="p-2 bg-blue-500/20 rounded-lg"><Mail className="w-4 h-4 text-blue-400" /></div>
                      <div>
                        <div className="font-bold text-white text-sm">Reply</div>
                        <div className="text-[10px] text-zinc-500">Respond to sender</div>
                      </div>
                    </button>
                    <button onClick={() => handleGenerateDraft("forward")} disabled={loadingAction?.startsWith("draft_")} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 text-left transition-colors">
                      <div className="p-2 bg-green-500/20 rounded-lg"><Send className="w-4 h-4 text-green-400" /></div>
                      <div>
                        <div className="font-bold text-white text-sm">Forward</div>
                        <div className="text-[10px] text-zinc-500">Share with others</div>
                      </div>
                    </button>
                    <button onClick={() => handleGenerateDraft("signature_request")} disabled={loadingAction?.startsWith("draft_")} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 text-left transition-colors">
                      <div className="p-2 bg-purple-500/20 rounded-lg"><FileSignature className="w-4 h-4 text-purple-400" /></div>
                      <div>
                        <div className="font-bold text-white text-sm">Signature Req.</div>
                        <div className="text-[10px] text-zinc-500">Ask for signatures</div>
                      </div>
                    </button>
                    <button onClick={() => handleGenerateDraft("clarification")} disabled={loadingAction?.startsWith("draft_")} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 text-left transition-colors">
                      <div className="p-2 bg-orange-500/20 rounded-lg"><Brain className="w-4 h-4 text-orange-400" /></div>
                      <div>
                        <div className="font-bold text-white text-sm">Clarification</div>
                        <div className="text-[10px] text-zinc-500">Ask questions</div>
                      </div>
                    </button>
                  </div>

                  {relatedDrafts && relatedDrafts.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                      <h4 className="font-bold text-white text-sm mb-3">Generated Drafts</h4>
                      <div className="space-y-2">
                        {relatedDrafts.map((draft: any) => (
                          <div key={draft.id} className="p-3 bg-black/20 rounded-lg flex justify-between items-center text-sm border border-white/5">
                             <div className="truncate pr-4">
                                <div className="text-white font-medium truncate">{draft.subject || "No Subject"}</div>
                                <div className="text-xs text-zinc-500 capitalize">
                                  {draft.metadata ? JSON.parse(draft.metadata).draftType : draft.type} • {draft.status.replace("_", " ")}
                                  {draft.metadata && JSON.parse(draft.metadata).exportStatus && (
                                    <span className="ml-1 text-purple-400">• {JSON.parse(draft.metadata).exportStatus.replace("_", " ")}</span>
                                  )}
                                </div>
                             </div>
                             <a href={`/drafts`} className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-xs whitespace-nowrap hover:bg-blue-500/30">View</a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="glass-card rounded-2xl p-6 border border-white/10">
                  <h3 className="text-lg font-bold text-white mb-4">Related Records</h3>
                  <div className="space-y-3">
                    {relatedCards && relatedCards.map((c: any) => (
                      <div key={c.id} className="p-2 bg-white/5 rounded text-sm flex items-center gap-2 text-zinc-300">
                        <Wallet className="w-4 h-4 text-zinc-500" /> {c.title}
                      </div>
                    ))}
                    {relatedFollowUps && relatedFollowUps.map((f: any) => (
                      <div key={f.id} className="p-2 bg-white/5 rounded text-sm flex items-center gap-2 text-zinc-300">
                        <CheckCircle className="w-4 h-4 text-zinc-500" /> {f.title}
                      </div>
                    ))}
                    {relatedApprovals && relatedApprovals.map((a: any) => (
                      <div key={a.id} className="p-2 bg-white/5 rounded text-sm flex items-center gap-2 text-zinc-300">
                        <CheckCircle className="w-4 h-4 text-zinc-500" /> Approval: {a.description}
                      </div>
                    ))}
                    {(!relatedCards?.length && !relatedFollowUps?.length && !relatedApprovals?.length) && (
                      <p className="text-sm text-zinc-500">No related records generated yet.</p>
                    )}
                  </div>
                </div>
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
