"use client";

import { useState } from "react";
import { formatBytes } from "@/lib/utils";

interface AttachmentMeta {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  status: string;
  localDocumentId?: string;
  localFilename?: string;
}

interface Props {
  inboxItemId: string;
  messageId: string;
  provider: "gmail" | "outlook_mail";
  attachments: AttachmentMeta[];
}

export function AttachmentList({ inboxItemId, messageId, provider, attachments }: Props) {
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [errorMessages, setErrorMessages] = useState<Record<string, string>>({});

  const handleDownload = async (att: AttachmentMeta) => {
    setDownloadingIds((prev) => new Set(prev).add(att.id));
    setErrorMessages((prev) => {
      const copy = { ...prev };
      delete copy[att.id];
      return copy;
    });

    try {
      const endpoint = provider === "gmail" 
        ? "/api/attachments/gmail/download" 
        : "/api/attachments/outlook/download";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inboxItemId,
          messageId,
          attachmentId: att.id
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Download failed");
      }
      
      // Successfully downloaded, trigger a page reload to update UI state
      window.location.reload();
    } catch (err: any) {
      setErrorMessages((prev) => ({ ...prev, [att.id]: err.message }));
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(att.id);
        return next;
      });
    }
  };

  if (!attachments || attachments.length === 0) return null;

  return (
    <div className="mt-4 space-y-2">
      <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Attachments</h4>
      <div className="grid gap-3">
        {attachments.map((att) => (
          <div key={att.id} className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex flex-col">
              <span className="font-medium text-white truncate max-w-[200px] md:max-w-md">{att.filename || "Unnamed File"}</span>
              <span className="text-xs text-zinc-500">
                {formatBytes(att.size)} • {att.contentType}
              </span>
              {errorMessages[att.id] && (
                <span className="text-xs text-red-400 mt-1">{errorMessages[att.id]}</span>
              )}
            </div>
            
            <div>
              {att.status === "downloaded" && att.localDocumentId ? (
                <a 
                  href={`/documents/${att.localDocumentId}`}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium rounded-lg transition-colors border border-white/10"
                >
                  View Document
                </a>
              ) : (
                <button
                  onClick={() => handleDownload(att)}
                  disabled={downloadingIds.has(att.id)}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {downloadingIds.has(att.id) ? (
                    <span className="animate-pulse">Downloading...</span>
                  ) : (
                    <span>Download</span>
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
