"use client";

import { Milestone, CheckCircle2, Circle, ArrowRight } from "lucide-react";

const PHASES = [
  {
    title: "Phase 1: Foundation (Completed)",
    status: "completed",
    items: ["UI Framework & Navigation", "Prisma Database Setup", "Life Wallet Architecture"]
  },
  {
    title: "Phase 2: Local Intelligence (Completed)",
    status: "completed",
    items: ["Local Rule-Based AI Engine", "Email & Calendar Import", "Document Analysis Mock", "Local Automation Worker", "Settings & Health Monitoring"]
  },
  {
    title: "Phase 3A: Gmail Read-Only Beta (Completed)",
    status: "completed",
    items: ["Gmail OAuth API", "Email sync and AI classification", "WalletCard & Contact Extraction"]
  },
  {
    title: "Phase 3B: Google Calendar Read-Only Beta (Completed)",
    status: "completed",
    items: ["Google Calendar OAuth", "Event Sync", "Deduplication & Cancellations", "Daily Brief Integration"]
  },
  {
    title: "Phase 3C: Outlook Calendar Read-Only Beta (Completed)",
    status: "completed",
    items: ["Microsoft Graph OAuth", "Outlook Calendar read-only sync"]
  },
  {
    title: "Phase 3D: Outlook Mail Read-Only Beta (Completed)",
    status: "completed",
    items: ["Microsoft Graph OAuth", "Outlook Mail read-only sync"]
  },
  {
    title: "Phase 3E: Attachment Download on Demand (Completed)",
    status: "completed",
    items: ["Gmail attachment download on demand", "Outlook Mail attachment download on demand", "Local document vault storage"]
  },
  {
    title: "Phase 3E.1: Attachment Storage Hardening (Completed)",
    status: "completed",
    items: ["Private data/uploads folder", "Controlled API document serving", "Public static file blocking"]
  },
  {
    title: "Phase 3F: Attachment Intelligence & Local Drafts (Completed)",
    status: "completed",
    items: ["AI provider intelligence actions", "Generate drafts from local documents", "Draft Approval Center Integration"]
  },
  {
    title: "Phase 3G: Safe Draft Export & Manual Send (Completed)",
    status: "completed",
    items: ["Local Draft Export to TXT/EML", "Draft Copy formatting", "Manual Send Tracking & Checklist"]
  },
  {
    title: "Phase 3G.1: Repository Hygiene + GitHub Sync (Completed)",
    status: "completed",
    items: ["Strict .gitignore", "Secret removal", "App smoke testing", "GitHub push"]
  },
  {
    title: "Phase 3H-0: Data Engineering + Analytics Showcase (Completed)",
    status: "completed",
    items: ["Local SQLite analytics layer", "Python data engineering pipeline", "SQL metric queries", "Data Quality & Risk features", "Engineering Showcase Portfolio Page"]
  },
  {
    title: "Phase 3H-0.1: Data/AI Portfolio Positioning + Language Balance Hardening (Completed)",
    status: "completed",
    items: ["Agentic workflow analytics", "AI evaluation with deterministic guardrails", "ML feature engineering & data contracts", "Data lineage graph & analytics marts", "Data/AI-first README & Showcase positioning", "Local language footprint script"]
  },
  {
    title: "Phase 3H: Provider-Side Draft Creation After Approval (Active)",
    status: "active",
    items: ["Gmail draft creation (gmail.compose)", "Outlook draft creation (Mail.ReadWrite)", "Isolated draft OAuth connectors", "Strict no-send policy enforcement", "Approval-gated, duplicate-blocked, fully audited"]
  },
  {
    title: "Phase 3I: Provider Draft Attachment Upload (Planned)",
    status: "pending",
    items: ["Upload local vault documents to provider drafts", "Preserve risk warnings in drafts"]
  },
  {
    title: "Phase 3J: Native Bridges & Desktop (Planned)",
    status: "pending",
    items: ["Apple Mail / Apple Calendar native-helper planning", "Local system calendar bridge planning", "Optional desktop wrapper"]
  },
  {
    title: "Phase 4: Live Deployments & Cloud Infrastructure (Pending Funding)",
    status: "pending",
    items: ["Cloud Deployment (Vercel/AWS)", "Live Email Sending", "Real-Time Stock Market Execution", "DocuSign Production", "Slack Incoming Webhooks"]
  }
];

export default function RoadmapPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Milestone className="text-blue-400" />
          Product Roadmap
        </h1>
        <p className="text-zinc-400 text-lg">
          Personal Assist is currently in Phase 2 (Local MVP). Here is where we are going.
        </p>
      </div>

      <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-purple-500 before:to-zinc-800">
        {PHASES.map((phase, i) => (
          <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Icon */}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-zinc-900 bg-zinc-900 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow absolute left-0 md:left-1/2 transform -translate-x-1/2 md:translate-x-[-50%]
              ${phase.status === 'completed' ? 'text-green-400' : phase.status === 'active' ? 'text-blue-400' : 'text-zinc-500'}`}>
              {phase.status === 'completed' ? <CheckCircle2 size={24} className="bg-zinc-900 rounded-full" /> : 
               phase.status === 'active' ? <ArrowRight size={24} className="bg-zinc-900 rounded-full animate-pulse" /> :
               <Circle size={24} className="bg-zinc-900 rounded-full" />}
            </div>

            {/* Content */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-card p-6 rounded-2xl ml-12 md:ml-0">
              <h3 className={`text-xl font-bold mb-4 ${phase.status === 'completed' ? 'text-green-400' : phase.status === 'active' ? 'text-blue-400' : 'text-zinc-400'}`}>
                {phase.title}
              </h3>
              <ul className="space-y-2">
                {phase.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-zinc-300">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${phase.status === 'completed' ? 'bg-green-500/50' : phase.status === 'active' ? 'bg-blue-500/50' : 'bg-zinc-700'}`} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
