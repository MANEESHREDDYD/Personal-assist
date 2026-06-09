import fs from "fs";
import path from "path";
import { Terminal, Database, Code, ShieldCheck, Activity, BrainCircuit, GitBranch, BarChart3, Bot, Workflow, Server, Lock, PenSquare } from "lucide-react";

export const dynamic = "force-dynamic";

const SKILL_BADGES = [
  { label: "Data Engineering", color: "from-blue-500 to-cyan-500" },
  { label: "Analytics Engineering", color: "from-emerald-500 to-teal-500" },
  { label: "Data Science", color: "from-purple-500 to-violet-500" },
  { label: "ML / AI Engineering", color: "from-rose-500 to-pink-500" },
  { label: "GenAI", color: "from-amber-500 to-orange-500" },
  { label: "Agentic AI", color: "from-indigo-500 to-blue-500" },
  { label: "Forward-Deployed Eng.", color: "from-lime-500 to-emerald-500" },
  { label: "Product Engineering", color: "from-sky-500 to-blue-500" },
  { label: "Software Development", color: "from-zinc-400 to-zinc-500" },
  { label: "Full Stack", color: "from-fuchsia-500 to-purple-500" },
];

export default async function ShowcasePage() {
  const analyticsPath = path.join(process.cwd(), "data", "analytics", "personal_assist_metrics.json");
  let metrics: any = null;
  let hasMetrics = false;

  try {
    if (fs.existsSync(analyticsPath)) {
      const data = fs.readFileSync(analyticsPath, "utf-8");
      metrics = JSON.parse(data);
      hasMetrics = true;
    }
  } catch (error) {
    console.error("Failed to load analytics metrics", error);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      {/* Header */}
      <header className="space-y-4">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent leading-tight">
          Personal Assist — Data Engineering, AI, GenAI, Agentic Workflow, and Forward-Deployed Product System
        </h1>
        <p className="text-zinc-400 max-w-4xl text-lg">
          A local-first AI operations platform demonstrating production-grade data engineering, 
          analytics pipelines, agentic workflow orchestration, document intelligence, and 
          human-in-the-loop automation — built with zero cloud costs and zero paid APIs.
        </p>
      </header>

      {/* Skill Badges */}
      <div className="flex flex-wrap gap-2">
        {SKILL_BADGES.map(b => (
          <span key={b.label} className={`px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${b.color} shadow-lg`}>
            {b.label}
          </span>
        ))}
      </div>

      {/* Dynamic Metrics Grid */}
      {!hasMetrics ? (
        <div className="p-8 border border-blue-500/30 bg-blue-500/10 rounded-xl text-center space-y-4">
          <Database className="w-12 h-12 text-blue-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Analytics Pipeline Not Run</h2>
          <p className="text-zinc-300">Execute the Python analytics pipeline to populate live metrics:</p>
          <code className="block bg-black/50 border border-white/10 p-4 rounded-lg text-emerald-400 font-mono mt-4 mx-auto max-w-md">
            npm run analytics:run
          </code>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <MetricCard title="Emails Ingested" value={metrics.counts?.total_emails} />
          <MetricCard title="Calendar Events" value={metrics.counts?.total_events} />
          <MetricCard title="Documents" value={metrics.counts?.total_documents} />
          <MetricCard title="Drafts" value={metrics.counts?.total_drafts} />
          <MetricCard title="Approved Drafts" value={metrics.counts?.approved_drafts} />
          <MetricCard title="Automation Runs" value={metrics.counts?.total_runs} />
          <MetricCard title="Audit Trail" value={metrics.counts?.total_audit_logs} />
          <MetricCard title="Integrations" value={metrics.counts?.total_connector_accounts} />
          <MetricCard title="Quality Issues" value={metrics.dataContracts?.summary?.total_violations ?? "-"} />
          <MetricCard title="Lineage Edges" value={metrics.lineageGraphSummary?.total_edges ?? "-"} />
        </div>
      )}

      {/* 1. Data Engineering System */}
      <Section title="Data Engineering System" icon={<Database size={20} />}>
        <ul className="space-y-2 text-zinc-300 text-sm">
          <li>• <strong>OAuth Ingestion Pipelines</strong> — Gmail (Google API) and Outlook (Microsoft Graph) with encrypted token storage</li>
          <li>• <strong>Sync & Deduplication</strong> — External ID tracking, upsert logic, cancellation handling for calendar events</li>
          <li>• <strong>Local SQLite Data Layer</strong> — Prisma ORM with 15+ models, full migration support</li>
          <li>• <strong>Python Analytics Pipeline</strong> — SQL metric queries, data quality checks, JSON/Markdown report generation</li>
          <li>• <strong>Data Contract Validation</strong> — Schema compliance checks for all major entities</li>
          <li>• <strong>Data Lineage Tracking</strong> — Entity-to-entity relationship graph with edge counts</li>
        </ul>
      </Section>

      {/* 2. Analytics & Analyst Layer */}
      <Section title="Analytics & Analyst Layer" icon={<BarChart3 size={20} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
            <h4 className="font-bold text-white mb-2">SQL Metrics Layer</h4>
            <p className="text-zinc-400 text-sm">14 SQL query files covering inbox, calendar, document, draft, approval, automation, audit, integration, agentic workflow, AI extraction, data quality, lineage, risk, and workload metrics.</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
            <h4 className="font-bold text-white mb-2">Analytics Data Marts</h4>
            <p className="text-zinc-400 text-sm">Local JSON marts for inbox, document, draft, integration, automation, and risk analysis — built by the Python pipeline for dashboard consumption.</p>
          </div>
        </div>
        {hasMetrics && metrics.analyticsMarts && (
          <div className="mt-4 bg-white/5 border border-white/10 p-4 rounded-xl">
            <h4 className="font-bold text-white mb-2">Live Mart Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm font-mono text-zinc-300">
              {Object.entries(metrics.analyticsMarts || {}).map(([k, v]: [string, any]) => (
                <div key={k} className="flex justify-between bg-white/5 px-3 py-1.5 rounded">
                  <span>{k}</span>
                  <span className="text-blue-400">{typeof v === 'object' ? Object.keys(v).length + ' keys' : String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* 3. AI / ML Feature Layer */}
      <Section title="AI / ML Feature Engineering" icon={<BrainCircuit size={20} />}>
        <ul className="space-y-2 text-zinc-300 text-sm">
          <li>• <strong>Urgency Score</strong> — Weighted combination of overdue reminders, pending follow-ups, and approval queue depth</li>
          <li>• <strong>Workload Score</strong> — User capacity estimation from active tasks, upcoming events, and pending items</li>
          <li>• <strong>Document Risk Score</strong> — Keyword-based risk detection in AI summaries (legal, payment, deadline, termination)</li>
          <li>• <strong>Integration Reliability</strong> — Connector health percentage from status and error tracking</li>
          <li>• <strong>Automation Failure Rate</strong> — Pipeline reliability from run success/failure ratios</li>
          <li>• <strong>Approval Complexity</strong> — Denial rate analysis to measure workflow friction</li>
        </ul>
        {hasMetrics && metrics.mlFeatureSummary && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(metrics.mlFeatureSummary || {}).map(([k, v]: [string, any]) => (
              <div key={k} className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl">
                <p className="text-xs text-zinc-500 capitalize">{k.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-white">{typeof v === 'object' ? v.score || JSON.stringify(v) : String(v)}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* 4. GenAI Document Intelligence */}
      <Section title="GenAI Document Intelligence" icon={<Bot size={20} />}>
        <ul className="space-y-2 text-zinc-300 text-sm">
          <li>• <strong>Document Summarization</strong> — Local LLM (Ollama) or rules-based extraction with structured output schema</li>
          <li>• <strong>Entity Extraction</strong> — Deadlines, parties, payment terms, signature requirements, action items</li>
          <li>• <strong>Draft Generation</strong> — AI-generated reply/forward/clarification/signature request drafts from document context</li>
          <li>• <strong>Risk Detection</strong> — Automatic sensitivity flagging with escalation to approval gates</li>
          <li>• <strong>Provider Abstraction</strong> — Pluggable AI backend (Ollama, rules fallback) with no paid API dependency</li>
        </ul>
        {hasMetrics && metrics.aiEvaluationMetrics && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            <MiniStat label="Classification Coverage" value={`${metrics.aiEvaluationMetrics.classification?.coverage_percent ?? 0}%`} />
            <MiniStat label="Extraction Coverage" value={`${metrics.aiEvaluationMetrics.extraction?.coverage_percent ?? 0}%`} />
            <MiniStat label="Risk Flag Rate" value={`${metrics.aiEvaluationMetrics.risk_flagging?.flag_rate ?? 0}%`} />
          </div>
        )}
      </Section>

      {/* 5. Agentic AI Workflow Orchestration */}
      <Section title="Agentic AI Workflow Orchestration" icon={<Workflow size={20} />}>
        <div className="space-y-4">
          <FlowCard title="Document Pipeline" flow="Gmail/Outlook → InboxItem → Attachment Download → Document → AI Extraction → EmailDraft → ApprovalRequest → Export / Provider Draft" />
          <FlowCard title="Email Classification Pipeline" flow="InboxItem → Category Classification → WalletCard / FollowUp / Reminder → Automation Trigger" />
          <FlowCard title="Calendar Pipeline" flow="Google/Outlook Calendar → CalendarEvent → WalletCard → Reminder → Daily Brief → Automation" />
        </div>
        {hasMetrics && metrics.agenticWorkflowMetrics && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            <MiniStat label="Approval Rate" value={`${metrics.agenticWorkflowMetrics.human_approval_gate?.approval_rate ?? 0}%`} />
            <MiniStat label="Automation Success" value={`${metrics.agenticWorkflowMetrics.automation_metrics?.success_rate ?? 100}%`} />
            <MiniStat label="No-Send Compliance" value={`${metrics.agenticWorkflowMetrics.safety_compliance?.compliance_rate ?? 100}%`} />
          </div>
        )}

        {/* Phase 3H — provider-side draft creation after approval */}
        <div className="mt-4 bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-2">
          <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
            <PenSquare size={16} /> Phase 3H — Provider-Side Draft Creation After Approval
          </h4>
          <ul className="text-zinc-300 text-sm space-y-1">
            <li>• Approved local drafts can be pushed as <strong>Gmail or Outlook drafts</strong> — only after explicit human approval</li>
            <li>• <strong>Strict no-send policy</strong>: the system creates drafts only and never calls any send endpoint</li>
            <li>• <strong>OAuth scope isolation</strong>: separate <code>gmail_draft</code> / <code>outlook_draft</code> connectors, distinct from read-only access</li>
            <li>• <strong>Auditability</strong>: every connect, creation, duplicate-block, and failure is written to the audit log</li>
            <li>• Attachments are <strong>not</strong> uploaded in this phase — added manually by the user (Phase 3I)</li>
          </ul>
          {hasMetrics && metrics.agenticWorkflowMetrics.provider_drafts && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
              <MiniStat label="Provider Drafts Created" value={String(metrics.agenticWorkflowMetrics.provider_drafts.provider_drafts_created ?? 0)} />
              <MiniStat label="Emails Sent" value={String(metrics.agenticWorkflowMetrics.provider_drafts.emails_sent ?? 0)} />
              <MiniStat label="Draft Connector Health" value={`${metrics.agenticWorkflowMetrics.provider_drafts.draft_connector_health ?? 0}%`} />
              <MiniStat label="Creation Failures" value={String(metrics.agenticWorkflowMetrics.provider_drafts.creation_failures ?? 0)} />
            </div>
          )}
        </div>

        {/* Phase 3I — provider draft attachment upload after approval */}
        <div className="mt-4 bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl space-y-2">
          <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
            <PenSquare size={16} /> Phase 3I — Provider Draft Attachment Upload After Approval
          </h4>
          <ul className="text-zinc-300 text-sm space-y-1">
            <li>• Selected local documents can be uploaded as <strong>attachments to an existing Gmail/Outlook draft</strong>, on explicit user action</li>
            <li>• <strong>Approval-gated provider mutation</strong>: only approved drafts with an existing provider draft can receive attachments</li>
            <li>• <strong>Secure private storage → provider draft</strong>: files are read from the private vault, never exposing local paths</li>
            <li>• <strong>No-send safety remains 100%</strong> — attachments update the draft only; no send endpoint is ever called</li>
            <li>• Small files only (≤ 3 MB) in this phase; <strong>large-upload sessions are planned as Phase 3J</strong></li>
          </ul>
          {hasMetrics && metrics.agenticWorkflowMetrics.provider_drafts?.attachments && (
            <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
              <MiniStat label="Attachments Uploaded" value={String(metrics.agenticWorkflowMetrics.provider_drafts.attachments.uploaded ?? 0)} />
              <MiniStat label="Upload Failures" value={String(metrics.agenticWorkflowMetrics.provider_drafts.attachments.failures ?? 0)} />
              <MiniStat label="Large Blocked (>3MB)" value={String(metrics.agenticWorkflowMetrics.provider_drafts.attachments.large_blocked ?? 0)} />
              <MiniStat label="Duplicate Blocked" value={String(metrics.agenticWorkflowMetrics.provider_drafts.attachments.duplicate_blocked ?? 0)} />
            </div>
          )}
        </div>
      </Section>

      {/* No-Send Compliance & Human-in-the-Loop Safety */}
      <Section title="No-Send Compliance & Human-in-the-Loop Safety" icon={<ShieldCheck size={20} />}>
        <p className="text-zinc-300 text-sm">
          Personal Assist creates provider-side drafts only after local approval. The final
          send remains a human action inside Gmail or Outlook. The metrics below come from the
          local analytics pipeline; the blocked actions are enforced in code and verified by a
          static no-send guard (<code className="text-emerald-300">npm run security:no-send</code>).
        </p>

        {hasMetrics && metrics.agenticWorkflowMetrics?.provider_drafts ? (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <MiniStat label="Emails Sent" value={String(metrics.agenticWorkflowMetrics.provider_drafts.emails_sent ?? 0)} />
            <MiniStat label="No-Send Compliance" value={`${metrics.agenticWorkflowMetrics.safety_compliance?.compliance_rate ?? 100}%`} />
            <MiniStat label="Provider Drafts Created" value={String(metrics.agenticWorkflowMetrics.provider_drafts.provider_drafts_created ?? 0)} />
            <MiniStat label="Creation Failures" value={String(metrics.agenticWorkflowMetrics.provider_drafts.creation_failures ?? 0)} />
            <MiniStat label="Approval → Draft" value={`${metrics.agenticWorkflowMetrics.provider_drafts.approval_to_provider_draft_rate ?? 0}%`} />
          </div>
        ) : (
          <p className="mt-4 text-zinc-500 text-sm">Run <code>npm run analytics:run</code> to populate live no-send metrics.</p>
        )}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          {[
            "Gmail send endpoint not used",
            "Outlook send endpoint not used",
            "No mailbox deletion",
            "No label / category modification",
            "No automatic draft creation",
            "No attachment upload in Phase 3H",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
              <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
              <span className="text-emerald-200 text-sm">{item}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* 6. Forward-Deployed Engineering */}
      <Section title="Forward-Deployed Engineering" icon={<Server size={20} />}>
        <ul className="space-y-2 text-zinc-300 text-sm">
          <li>• <strong>Zero-Cost Local Deployment</strong> — Runs entirely on one machine with no cloud infrastructure</li>
          <li>• <strong>No Paid APIs</strong> — Standard library Python, local LLM, free OAuth tiers</li>
          <li>• <strong>No External Telemetry</strong> — Zero tracking, zero analytics leaving the device</li>
          <li>• <strong>Demo Mode</strong> — Guided onboarding with seed data for immediate evaluation</li>
          <li>• <strong>PWA Support</strong> — Installable as a local app on desktop and mobile</li>
        </ul>
      </Section>

      {/* 7. Software Engineering / Full Stack */}
      <Section title="Software Engineering / Full Stack" icon={<Code size={20} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-zinc-300 text-sm">
          <div>
            <h4 className="font-bold text-white mb-1">Backend</h4>
            <ul className="space-y-1">
              <li>• Next.js 16 App Router with Server Components</li>
              <li>• Prisma ORM with SQLite (15+ models)</li>
              <li>• OAuth 2.0 (Google, Microsoft) with state validation</li>
              <li>• Scoped connector isolation (read-only vs draft-creation)</li>
              <li>• AES-256 encrypted token storage, no-send enforcement</li>
              <li>• Background automation worker + audit logging</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-white mb-1">Frontend / UI</h4>
            <ul className="space-y-1">
              <li>• Glassmorphic dark theme with Tailwind CSS</li>
              <li>• Framer Motion animations and transitions</li>
              <li>• Mobile-responsive PWA shell</li>
              <li>• Global search command palette (Cmd+K)</li>
              <li>• Approval Center and audit log UI</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 8. Data Quality & Lineage */}
      {hasMetrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Data Quality */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-400" /> Data Quality Checks
            </h3>
            <ul className="space-y-2 text-zinc-300 font-mono text-sm">
              {Object.entries(metrics.qualityChecks || {}).map(([k, v]) => (
                <li key={k} className="flex justify-between">
                  <span>{k}</span>
                  <span className={v === 0 ? "text-emerald-400" : "text-rose-400"}>{String(v)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Lineage */}
          <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <GitBranch size={18} className="text-blue-400" /> Data Lineage Graph
            </h3>
            {metrics.lineageGraphSummary ? (
              <ul className="space-y-2 text-zinc-300 font-mono text-sm">
                {(metrics.lineageGraphSummary.edges || []).map((e: any, i: number) => (
                  <li key={i} className="flex justify-between bg-white/5 px-3 py-1.5 rounded">
                    <span>{e.source} → {e.target}</span>
                    <span className="text-blue-400">{e.count}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-500 text-sm">Run analytics pipeline to see lineage data.</p>
            )}
          </div>
        </div>
      )}

      {/* Privacy & Safety */}
      <Section title="Privacy & Safety Model" icon={<Lock size={20} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SafetyBadge label="No Telemetry" />
          <SafetyBadge label="No Cloud Storage" />
          <SafetyBadge label="No Email Sending" />
          <SafetyBadge label="No Paid APIs" />
          <SafetyBadge label="Encrypted Tokens" />
          <SafetyBadge label="Private File Vault" />
          <SafetyBadge label="Blocked Executables" />
          <SafetyBadge label="Audit Trail" />
        </div>
      </Section>

      {/* Recommendations */}
      {hasMetrics && metrics.recommendations && (
        <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-xl">
          <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
            <Activity size={18} /> Automated Analyst Recommendations
          </h3>
          <ul className="list-disc pl-5 text-blue-200 space-y-1">
            {metrics.recommendations.map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Footer */}
      <footer className="pt-4 text-center text-zinc-500 text-sm border-t border-white/5">
        <p>Personal Assist operates 100% locally. No analytics, tracking, or private data leaves this machine.</p>
        {hasMetrics && <p className="mt-1">Last Analysis Run: {new Date(metrics.generatedAt).toLocaleString()}</p>}
      </footer>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: any }) {
  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-xl text-center">
      <p className="text-xs text-zinc-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-white">{value ?? "-"}</p>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: any; children: any }) {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2 flex items-center gap-2">
        <span className="text-blue-400">{icon}</span> {title}
      </h2>
      {children}
    </section>
  );
}

function FlowCard({ title, flow }: { title: string; flow: string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
      <h4 className="font-bold text-blue-300 mb-2">{title}</h4>
      <p className="text-zinc-300 text-sm font-mono leading-relaxed">{flow}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-xl">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="text-lg font-bold text-white">{value}</p>
    </div>
  );
}

function SafetyBadge({ label }: { label: string }) {
  return (
    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg text-center">
      <span className="text-emerald-400 text-sm font-medium">{label}</span>
    </div>
  );
}
