"use client";

import { useState } from "react";
import { InboxItem } from "@prisma/client";
import { CorrectionModal } from "./CorrectionModal";
import { AlertTriangle, Edit3 } from "lucide-react";
import { parseMetadata } from "@/lib/metadata";
import { AttachmentList } from "@/components/inbox/AttachmentList";

interface Props {
  item: InboxItem;
  relatedDocs?: any[];
  relatedDrafts?: any[];
}

export function InboxItemCard({ item, relatedDocs, relatedDrafts }: Props) {
  const [showCorrection, setShowCorrection] = useState(false);
  const meta = parseMetadata<{
    attachmentsMeta?: { id: string; filename: string; contentType: string; size: number; status: string; localDocumentId?: string; localFilename?: string }[];
    messageId?: string;
    provider?: "gmail" | "outlook_mail";
    confidenceScore?: number;
    [key: string]: unknown;
  }>(item.metadata);
  const confidenceScore = meta.confidenceScore;
  
  const isLowConfidence = confidenceScore !== undefined && confidenceScore < 0.8;

  return (
    <>
      <div className={`glass-card rounded-xl p-5 border-l-4 ${isLowConfidence ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-white">{item.subject}</h3>
          <div className="flex items-center gap-2">
            {isLowConfidence && (
              <span className="flex items-center gap-1 text-[10px] text-yellow-500 uppercase tracking-wider font-bold">
                <AlertTriangle className="w-3 h-3" /> Low Conf
              </span>
            )}
            <span className="px-2 py-1 rounded text-[10px] uppercase tracking-wider font-bold bg-white/10 text-zinc-300">
              {item.category}
            </span>
          </div>
        </div>
        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{item.body}</p>
        <div className="flex justify-between items-center text-xs text-zinc-500">
          <span>From: {item.sender}</span>
          <div className="flex items-center gap-3">
            {confidenceScore !== undefined && (
              <span>Score: {(confidenceScore * 100).toFixed(0)}%</span>
            )}
            <button 
              onClick={() => setShowCorrection(true)}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 font-medium transition-colors"
            >
              <Edit3 className="w-3 h-3" /> Correct
            </button>
          </div>
        </div>
        
        {meta.attachmentsMeta && meta.attachmentsMeta.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <AttachmentList 
              inboxItemId={item.id}
              messageId={meta.messageId || (item.externalId ? item.externalId.split(':')[1] : "")}
              provider={meta.provider!}
              attachments={meta.attachmentsMeta}
            />
          </div>
        )}

        {(relatedDocs && relatedDocs.length > 0) || (relatedDrafts && relatedDrafts.length > 0) ? (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
            {relatedDocs && relatedDocs.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-400 mb-2">Downloaded Documents</p>
                <div className="space-y-1">
                  {relatedDocs.map(d => (
                    <a key={d.id} href={`/documents/${d.id}`} className="block px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-blue-400 transition-colors">
                      {d.originalName}
                    </a>
                  ))}
                </div>
              </div>
            )}
            
            {relatedDrafts && relatedDrafts.length > 0 && (
              <div>
                <p className="text-xs font-bold text-zinc-400 mb-2">Generated Drafts</p>
                <div className="space-y-1">
                  {relatedDrafts.map(d => (
                    <a key={d.id} href="/drafts" className="block px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg text-sm text-purple-400 transition-colors flex justify-between items-center">
                      <span className="truncate pr-2">{d.subject || "No Subject"}</span>
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">
                        {d.status.replace("_", " ")}
                        {d.metadata && JSON.parse(d.metadata).exportStatus && (
                          <span className="ml-1 opacity-75">• {JSON.parse(d.metadata).exportStatus.replace("_", " ")}</span>
                        )}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {showCorrection && (
        <CorrectionModal 
          inboxItemId={item.id} 
          currentCategory={item.category || "General"} 
          onClose={() => setShowCorrection(false)} 
        />
      )}
    </>
  );
}
