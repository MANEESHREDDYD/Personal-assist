"use client";

import { useState } from "react";
import { generateDashboardBrief } from "./actions/dashboard";
import { Loader2, Sparkles, Moon } from "lucide-react";

export function DashboardBriefGenerator() {
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [loadingEvening, setLoadingEvening] = useState(false);

  async function handleDaily() {
    setLoadingDaily(true);
    await generateDashboardBrief("daily_start");
    setLoadingDaily(false);
  }

  async function handleEvening() {
    setLoadingEvening(true);
    await generateDashboardBrief("daily_end");
    setLoadingEvening(false);
  }

  return (
    <div className="flex gap-4 mb-8">
      <button 
        onClick={handleDaily}
        disabled={loadingDaily}
        className="flex-1 py-4 px-4 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 text-blue-400 font-semibold rounded-2xl transition-all flex justify-center items-center gap-2"
      >
        {loadingDaily ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        Generate Daily Life Brief
      </button>
      
      <button 
        onClick={handleEvening}
        disabled={loadingEvening}
        className="flex-1 py-4 px-4 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 hover:from-indigo-500/30 hover:to-purple-500/30 border border-indigo-500/30 text-indigo-400 font-semibold rounded-2xl transition-all flex justify-center items-center gap-2"
      >
        {loadingEvening ? <Loader2 className="w-5 h-5 animate-spin" /> : <Moon className="w-5 h-5" />}
        Generate End-of-Day Brief
      </button>
    </div>
  );
}
