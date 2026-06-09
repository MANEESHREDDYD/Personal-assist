"use client";

import { useState } from "react";
import { correctInboxItem } from "../actions/inbox";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, Loader2 } from "lucide-react";

interface Props {
  inboxItemId: string;
  currentCategory: string;
  onClose: () => void;
}

const CATEGORIES = [
  { label: "Payment", walletType: "payment" },
  { label: "Travel", walletType: "travel" },
  { label: "Ticket", walletType: "ticket" },
  { label: "Order", walletType: "order" },
  { label: "Document Review", walletType: "document" },
  { label: "General", walletType: "task" },
];

export function CorrectionModal({ inboxItemId, currentCategory, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectedCat, setSelectedCat] = useState(CATEGORIES.find(c => c.label === currentCategory) || CATEGORIES[5]);

  async function handleSave() {
    setLoading(true);
    await correctInboxItem(inboxItemId, selectedCat.label, selectedCat.walletType);
    setLoading(false);
    onClose();
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl p-6"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <h3 className="text-xl font-bold text-white mb-4">Correct Category</h3>
          <p className="text-sm text-zinc-400 mb-4">Select the correct category for this email to update your wallet.</p>

          <div className="space-y-2 mb-6">
            {CATEGORIES.map(cat => (
              <button
                key={cat.label}
                onClick={() => setSelectedCat(cat)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${
                  selectedCat.label === cat.label
                    ? "bg-purple-500/20 border-purple-500/50 text-white"
                    : "bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10"
                }`}
              >
                <span className="font-medium text-sm">{cat.label}</span>
                {selectedCat.label === cat.label && <CheckCircle className="w-4 h-4 text-purple-400" />}
              </button>
            ))}
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Correction"}
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
