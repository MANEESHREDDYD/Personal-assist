"use client";

import { WalletCard } from "@prisma/client";
import { 
  FileText, CreditCard, Plane, Ticket, ShoppingBag, 
  Calendar, LineChart, Bell, CheckSquare, Zap, MapPin
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { WalletDetailsModal } from "./WalletDetailsModal";

interface Props {
  card: WalletCard;
}

const iconMap: Record<string, any> = {
  document: FileText,
  payment: CreditCard,
  travel: Plane,
  ticket: Ticket,
  order: ShoppingBag,
  meeting: Calendar,
  stock: LineChart,
  reminder: Bell,
  task: CheckSquare,
};

const colorMap: Record<string, string> = {
  document: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  payment: "text-green-400 bg-green-400/10 border-green-400/20",
  travel: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  ticket: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  order: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  meeting: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
  stock: "text-teal-400 bg-teal-400/10 border-teal-400/20",
  reminder: "text-pink-400 bg-pink-400/10 border-pink-400/20",
  task: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

export function WalletCardItem({ card }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = iconMap[card.type] || Zap;
  const colorClass = colorMap[card.type] || "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="glass-card rounded-2xl p-5 cursor-pointer relative group flex flex-col justify-between"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-xl border ${colorClass}`}>
              <Icon className="w-6 h-6" />
            </div>
            {card.amount != null && (
              <span className="font-bold text-white text-lg">
                ${card.amount.toFixed(2)}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">{card.title}</h3>
          <p className="text-sm text-zinc-400 mb-4">{card.category}</p>
        </div>

        <div>
          {card.date && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
              <Calendar className="w-3 h-3" />
              {new Date(card.date).toLocaleDateString()}
            </div>
          )}
          {card.location && (
            <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
              <MapPin className="w-3 h-3" />
              {card.location}
            </div>
          )}
          
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
              card.status.toLowerCase().includes('pending') || card.status.toLowerCase().includes('needs') 
                ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                : 'bg-white/5 text-zinc-300 border-white/10'
            }`}>
              {card.status}
            </span>
            <span className="text-xs text-zinc-500 font-medium">
              {card.source === "gmail_attachment" ? "Gmail Attachment" :
               card.source === "outlook_attachment" ? "Outlook Attachment" :
               card.source || "Manual"}
            </span>
          </div>
        </div>
      </motion.div>

      {isOpen && <WalletDetailsModal card={card} onClose={() => setIsOpen(false)} />}
    </>
  );
}
