"use client";

import { useState } from "react";
import { enableRule, disableRule, runNow, resetDefaultRules } from "../actions/automations";
import { CheckCircle2, Play, RefreshCw, XCircle, Clock, Zap } from "lucide-react";

export function AutomationsClient({ rules, recentRuns }: { rules: any[], recentRuns: any[] }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async (id: string, currentlyEnabled: boolean) => {
    setLoading(true);
    if (currentlyEnabled) {
      await disableRule(id);
    } else {
      await enableRule(id);
    }
    setLoading(false);
  };

  const handleRunNow = async () => {
    setLoading(true);
    await runNow();
    setLoading(false);
  };

  const handleReset = async () => {
    setLoading(true);
    await resetDefaultRules();
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleRunNow}
          disabled={loading}
          className="flex items-center gap-2 bg-zinc-100 text-zinc-900 px-4 py-2 rounded-md font-medium hover:bg-white disabled:opacity-50"
        >
          <Play size={18} />
          Run Automations Now
        </button>
        <button
          onClick={handleReset}
          disabled={loading}
          className="flex items-center gap-2 bg-zinc-800 text-zinc-300 px-4 py-2 rounded-md font-medium hover:bg-zinc-700 disabled:opacity-50"
        >
          <RefreshCw size={18} />
          Reset Default Rules
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
            <Zap size={18} className="text-yellow-400" />
            Configured Rules
          </h2>
          <span className="text-xs text-zinc-500">{rules.length} rules loaded</span>
        </div>
        <div className="divide-y divide-zinc-800">
          {rules.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No rules configured. Click "Reset Default Rules" to load the recommended local automations.
            </div>
          ) : rules.map((rule) => (
            <div key={rule.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-medium text-zinc-100">{rule.name}</h3>
                  {rule.enabled ? (
                    <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full border border-green-500/20">Active</span>
                  ) : (
                    <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-0.5 rounded-full border border-zinc-700">Disabled</span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mb-2">{rule.description}</p>
                <div className="flex gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    Last run: {rule.lastRunAt ? new Date(rule.lastRunAt).toLocaleString() : "Never"}
                  </span>
                  <span>Runs: {rule.runCount}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(rule.id, rule.enabled)}
                  disabled={loading}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium border ${rule.enabled ? 'border-zinc-700 text-zinc-300 hover:bg-zinc-800' : 'border-green-900/50 text-green-400 bg-green-900/20 hover:bg-green-900/40'} disabled:opacity-50 transition-colors`}
                >
                  {rule.enabled ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mt-8">
         <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="font-semibold text-zinc-100 flex items-center gap-2">
            <RefreshCw size={18} className="text-blue-400" />
            Recent Runs
          </h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {recentRuns.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">
              No automation runs yet. Start the worker or click "Run Automations Now".
            </div>
          ) : recentRuns.map((run) => (
             <div key={run.id} className="p-4 flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  {run.status === "success" ? (
                    <CheckCircle2 className="text-green-500" size={18} />
                  ) : run.status === "skipped" ? (
                    <RefreshCw className="text-zinc-500" size={18} />
                  ) : (
                    <XCircle className="text-red-500" size={18} />
                  )}
                  <div>
                    <div className="font-medium text-zinc-200">{run.rule.name}</div>
                    <div className="text-zinc-500">{new Date(run.startedAt).toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-zinc-400 text-right max-w-sm truncate" title={run.resultSummary || run.errorMessage}>
                  {run.status === "failed" ? <span className="text-red-400">{run.errorMessage}</span> : run.resultSummary}
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}
