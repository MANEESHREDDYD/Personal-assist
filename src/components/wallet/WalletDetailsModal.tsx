"use client";

import { WalletCard } from "@prisma/client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, MapPin, DollarSign, Tag, Link as LinkIcon, Edit3 } from "lucide-react";
import { parseMetadata } from "@/lib/metadata";

interface Props {
  card: WalletCard;
  onClose: () => void;
}

export function WalletDetailsModal({ card, onClose }: Props) {
  const meta = parseMetadata(card.metadata);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 pr-12">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white">
                  {card.type}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  card.status.toLowerCase().includes('pending') || card.status.toLowerCase().includes('needs') 
                    ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                    : 'bg-green-500/10 text-green-500 border-green-500/20'
                }`}>
                  {card.status}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">{card.title}</h2>
              <p className="text-zinc-400 text-lg">{card.category}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              {card.amount != null && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-2 rounded-xl bg-green-500/20 text-green-400"><DollarSign className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Amount</p>
                    <p className="text-lg font-semibold text-white">${card.amount.toFixed(2)}</p>
                  </div>
                </div>
              )}
              {card.date && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400"><Calendar className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Date</p>
                    <p className="text-lg font-semibold text-white">{new Date(card.date).toLocaleString()}</p>
                  </div>
                </div>
              )}
              {card.location && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400"><MapPin className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Location</p>
                    <p className="text-lg font-semibold text-white">{card.location}</p>
                  </div>
                </div>
              )}
              {card.source && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400"><Tag className="w-5 h-5" /></div>
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1">Source</p>
                    <p className="text-lg font-semibold text-white">{card.source}</p>
                  </div>
                </div>
              )}
            </div>

            {card.aiSummary && (
              <div className="mb-8">
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-purple-400" /> AI Summary
                </h3>
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 text-zinc-300 text-sm leading-relaxed">
                  {card.aiSummary}
                </div>
              </div>
            )}

            {Object.keys(meta).length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4 text-blue-400" /> Extracted Metadata
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(meta).map(([k, v]) => (
                    <div key={k} className="p-3 rounded-xl bg-white/5 border border-white/5">
                      <p className="text-xs text-zinc-500 font-medium mb-1">{k}</p>
                      <p className="text-sm text-zinc-200 break-words">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
