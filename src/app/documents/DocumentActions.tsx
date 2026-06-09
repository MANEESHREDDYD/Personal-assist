"use client";

import { useState } from "react";
import { mockSummarizeDocument, mockPrepareForSignature, mockCreateApprovalRequest } from "../actions/documents";
import { Sparkles, PenTool, CheckSquare, Loader2, Mail } from "lucide-react";
import Link from "next/link";

interface Props {
  documentId: string;
  documentName: string;
}

export function DocumentActions({ documentId, documentName }: Props) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  async function handleAction(action: string, fn: () => Promise<any>) {
    setLoadingAction(action);
    await fn();
    setLoadingAction(null);
  }

  return (
    <div className="flex gap-2 mt-4 pt-4 border-t border-white/10 flex-wrap">
      <button 
        disabled={loadingAction !== null}
        onClick={() => handleAction("summarize", () => mockSummarizeDocument(documentId))}
        className="px-3 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loadingAction === "summarize" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        Summarize
      </button>

      <button 
        disabled={loadingAction !== null}
        onClick={() => handleAction("signature", () => mockPrepareForSignature(documentId))}
        className="px-3 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loadingAction === "signature" ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenTool className="w-3 h-3" />}
        Request Signature
      </button>

      <button 
        disabled={loadingAction !== null}
        onClick={() => handleAction("approval", () => mockCreateApprovalRequest(documentId, documentName))}
        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        {loadingAction === "approval" ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckSquare className="w-3 h-3" />}
        Create Approval
      </button>

      <Link 
        href={`/drafts?sourceId=${documentId}&type=document_send`}
        className="px-3 py-1.5 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
      >
        <Mail className="w-3 h-3" />
        Draft Email
      </Link>
    </div>
  );
}
