"use client";

import { useState } from "react";
import { Trash2, AlertTriangle, Play } from "lucide-react";
import { resetDatabaseSafely, seedDemoNotifications, seedDemoApprovals, seedDemoCalendar, seedDemoWorkflow, generateDemoStockBrief } from "../actions/demo";

export function DemoModePanel() {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleAction = async (actionFn: () => Promise<{ success: boolean; error?: string }>) => {
    setLoading(true);
    const result = await actionFn();
    if (!result.success) {
      alert("Error: " + result.error);
    }
    setLoading(false);
  };

  const handleReset = async () => {
    setLoading(true);
    const result = await resetDatabaseSafely();
    if (result.success) {
      setShowConfirm(false);
    } else {
      alert("Error: " + result.error);
    }
    setLoading(false);
  };

  return (
    <div className="glass-card rounded-2xl p-6 border-red-500/20 border">
      <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
        <AlertTriangle size={20} />
        Demo Mode
      </h2>
      <p className="text-zinc-400 text-sm mb-6">
        Generate mock data to test workflows, or destructively reset all user data back to a clean state.
      </p>

      <div className="flex flex-wrap gap-3 mb-8">
        <button
          onClick={async () => {
             setLoading(true);
             const { resetOnboarding } = await import("../actions/onboarding");
             const result = await resetOnboarding();
             if (!result.success) alert("Error: " + result.error);
             setLoading(false);
          }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-sm text-zinc-300"
        >
          <Play size={14} /> Reset Onboarding State
        </button>
        <button
          onClick={async () => {
             setLoading(true);
             const { generateDemoDocumentScenario } = await import("../actions/demo");
             await generateDemoDocumentScenario();
             setLoading(false);
          }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-sm text-zinc-300"
        >
          <Play size={14} /> Document Scenario
        </button>
        <button
          onClick={async () => {
             setLoading(true);
             const { generateDemoTravelScenario } = await import("../actions/demo");
             await generateDemoTravelScenario();
             setLoading(false);
          }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-sm text-zinc-300"
        >
          <Play size={14} /> Travel Scenario
        </button>
        <button
          onClick={async () => {
             setLoading(true);
             const { generateDemoStockScenario } = await import("../actions/demo");
             await generateDemoStockScenario();
             setLoading(false);
          }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-sm text-zinc-300"
        >
          <Play size={14} /> Stock Scenario
        </button>
        <button
          onClick={async () => {
             setLoading(true);
             const { generateDemoInboxScenario } = await import("../actions/demo");
             await generateDemoInboxScenario();
             setLoading(false);
          }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-sm text-zinc-300"
        >
          <Play size={14} /> Inbox Scenario
        </button>
      </div>

      <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl">
        <h3 className="font-semibold text-red-400 mb-2">Destructive Reset</h3>
        <p className="text-sm text-zinc-500 mb-4">This will delete all documents, wallet cards, notifications, and inbox items. It does not delete your system settings or configured automation rules.</p>
        
        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-md font-medium text-sm transition-colors"
          >
            <Trash2 size={16} />
            Reset All User Data
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-red-900/40 p-3 rounded-lg border border-red-500/30">
             <span className="text-red-200 text-sm font-medium">Are you sure? This cannot be undone.</span>
             <button
               onClick={handleReset}
               disabled={loading}
               className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md text-sm font-bold disabled:opacity-50"
             >
               Yes, Delete Everything
             </button>
             <button
               onClick={() => setShowConfirm(false)}
               disabled={loading}
               className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm disabled:opacity-50"
             >
               Cancel
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
