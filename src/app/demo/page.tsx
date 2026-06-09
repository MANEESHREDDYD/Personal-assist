"use client";

import { useState } from "react";
import { CheckSquare, Square, Play } from "lucide-react";

const DEMO_STEPS = [
  { id: "dashboard", label: "View Daily Command Center and Briefs" },
  { id: "wallet", label: "Explore Life Wallet cards" },
  { id: "import_eml", label: "Import an .eml file in Inbox" },
  { id: "import_ics", label: "Import an .ics file in Calendar" },
  { id: "upload_doc", label: "Upload a document in Documents" },
  { id: "edit_doc", label: "Generate an AI edit for a document" },
  { id: "redline", label: "Accept a redline change" },
  { id: "sign_mock", label: "Prepare and send a native signing mock" },
  { id: "simulate_sign", label: "Simulate a signer completing the document" },
  { id: "create_draft", label: "Create an email draft from an item" },
  { id: "approve_draft", label: "Approve a draft in Approvals" },
  { id: "view_notifs", label: "View global notifications" },
  { id: "run_automations", label: "Manually run an automation rule" },
  { id: "gen_brief", label: "Generate a daily or evening brief" },
  { id: "export_data", label: "Export local data in Settings" },
];

export default function GuidedDemoPage() {
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const toggleStep = (id: string) => {
    setCompletedSteps(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const progress = Math.round((completedSteps.length / DEMO_STEPS.length) * 100);

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Play className="text-purple-400" />
          Guided Product Demo
        </h1>
        <p className="text-zinc-400">
          Follow this checklist to explore the full capabilities of the Personal Assist MVP. Everything you do here stays strictly on your local machine.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-white font-bold">Demo Progress</span>
          <span className="text-purple-400 font-bold">{progress}%</span>
        </div>
        <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="glass-card rounded-2xl p-2">
        {DEMO_STEPS.map((step, index) => {
          const isDone = completedSteps.includes(step.id);
          return (
            <div 
              key={step.id} 
              className={`flex items-center gap-4 p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-pointer ${isDone ? "opacity-60" : ""}`}
              onClick={() => toggleStep(step.id)}
            >
              <button className="text-zinc-400 hover:text-white transition-colors">
                {isDone ? (
                  <CheckSquare className="text-green-400" />
                ) : (
                  <Square />
                )}
              </button>
              <div className="flex-1">
                <p className={`text-white font-medium ${isDone ? "line-through text-zinc-500" : ""}`}>
                  {index + 1}. {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      
      {progress === 100 && (
        <div className="mt-8 p-6 bg-green-500/10 border border-green-500/30 rounded-2xl text-center animate-in fade-in slide-in-from-bottom-4">
          <h2 className="text-2xl font-bold text-green-400 mb-2">Demo Completed!</h2>
          <p className="text-zinc-300">You've explored all the major features of the Phase 2 MVP. Great job!</p>
        </div>
      )}
    </div>
  );
}
