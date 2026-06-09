"use client";

import { useState } from "react";
import { addStock, generateStockBrief } from "../actions/stocks";
import { Plus, Loader2, Zap } from "lucide-react";

export function StockForm() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    await addStock(formData);
    (e.target as HTMLFormElement).reset();
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="glass-card rounded-2xl p-6">
      <h2 className="text-xl font-bold text-white mb-4">Add to Watchlist</h2>
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-300">Ticker Symbol</label>
          <input 
            name="ticker" 
            required 
            placeholder="AAPL" 
            className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white uppercase focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Reason for Watching</label>
          <input 
            name="reason" 
            placeholder="Upcoming earnings report" 
            className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-zinc-300">Notes</label>
          <textarea 
            name="notes" 
            rows={2}
            placeholder="Support level at $150..." 
            className="mt-1 w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors border border-white/10 font-medium flex justify-center items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Ticker
        </button>
      </div>
    </form>
  );
}

export function BriefGenerator({ type, label }: { type: "stock_start" | "stock_end", label: string }) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    await generateStockBrief(type);
    setLoading(false);
  }

  return (
    <button 
      onClick={handleGenerate}
      disabled={loading}
      className="w-full py-3 px-4 bg-gradient-to-r from-teal-500/20 to-blue-500/20 hover:from-teal-500/30 hover:to-blue-500/30 border border-teal-500/30 text-teal-400 font-semibold rounded-lg transition-all flex justify-center items-center gap-2"
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-4 h-4" />}
      {label}
    </button>
  );
}
