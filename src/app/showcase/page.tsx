import fs from "fs";
import path from "path";
import { Terminal, Database, Code, ShieldCheck, Activity, BrainCircuit } from "lucide-react";

export const dynamic = "force-dynamic";

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
    <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent flex items-center gap-3">
          <Terminal className="text-blue-400" />
          Engineering Showcase
        </h1>
        <p className="text-zinc-400 max-w-3xl">
          Personal Assist is a comprehensive portfolio system demonstrating full-stack engineering,
          data science, AI feature extraction, and local-first data engineering.
        </p>
      </header>

      {!hasMetrics ? (
        <div className="p-8 border border-blue-500/30 bg-blue-500/10 rounded-xl text-center space-y-4">
          <Database className="w-12 h-12 text-blue-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Local Analytics Not Generated</h2>
          <p className="text-zinc-300">Run the following command to execute the local Python analytics pipeline:</p>
          <code className="block bg-black/50 border border-white/10 p-4 rounded-lg text-emerald-400 font-mono mt-4 mx-auto max-w-md">
            npm run analytics:run
          </code>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard title="Imported Emails" value={metrics.counts?.total_emails} icon={<MailIcon />} />
          <MetricCard title="Calendar Events" value={metrics.counts?.total_events} icon={<CalendarIcon />} />
          <MetricCard title="Documents Extracted" value={metrics.counts?.total_documents} icon={<DocIcon />} />
          <MetricCard title="Drafts Generated" value={metrics.counts?.total_drafts} icon={<DraftIcon />} />
          <MetricCard title="Automations Run" value={metrics.counts?.total_runs} icon={<Activity />} />
          <MetricCard title="Audit Logs" value={metrics.counts?.total_audit_logs} icon={<ShieldCheck />} />
          <MetricCard title="Connected Integrations" value={metrics.counts?.total_connector_accounts} icon={<Database />} />
          <MetricCard title="Workload Score" value={metrics.workflowMetrics?.workload_score} icon={<BrainCircuit />} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">Skills Demonstrated</h2>
          <ul className="space-y-3 text-zinc-300">
            <li><strong className="text-blue-400">Data Engineering:</strong> Local SQLite ingestion, sync pipelines, deduplication, SQL metric views, Python reporting.</li>
            <li><strong className="text-purple-400">Data Science / AI:</strong> Rule-based risk scoring, sensitive data detection, feature extraction, entity mapping.</li>
            <li><strong className="text-emerald-400">Gen AI:</strong> Document summarization, draft generation, local LLM orchestration with structured schema enforcement.</li>
            <li><strong className="text-amber-400">Full Stack / Backend:</strong> Next.js App Router, Prisma ORM, local OAuth token encryption, secure API file serving.</li>
            <li><strong className="text-pink-400">Frontend / UI:</strong> Glassmorphic design, Framer Motion, PWA, mobile-responsive layouts, local command palette.</li>
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">Data Flow Examples</h2>
          <div className="space-y-4">
            <FlowCard title="Email Attachment Workflow" flow="Gmail/Outlook → InboxItem → Extracted Metadata → Document → AI Redline → Approval → Export" />
            <FlowCard title="Calendar Workflow" flow="Google/Outlook Sync → CalendarEvent → Unified Wallet → Daily Brief → Automation Trigger" />
            <FlowCard title="Draft Generation" flow="Intelligence Action → EmailDraft → Draft Workspace → Approval Center → Local Export (.eml/.txt)" />
          </div>
        </section>

        {hasMetrics && (
          <section className="space-y-4 lg:col-span-2">
            <h2 className="text-2xl font-bold text-white border-b border-white/10 pb-2">Data Quality & Risk Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-4">Quality Checks</h3>
                <ul className="space-y-2 text-zinc-300 font-mono text-sm">
                  {Object.entries(metrics.qualityChecks || {}).map(([k, v]) => (
                    <li key={k} className="flex justify-between">
                      <span>{k}</span>
                      <span className={v === 0 ? "text-emerald-400" : "text-rose-400"}>{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                <h3 className="text-lg font-bold text-white mb-4">Risk Distribution</h3>
                <ul className="space-y-2 text-zinc-300 font-mono text-sm">
                  {Object.entries(metrics.riskDistribution || {}).map(([k, v]) => (
                    <li key={k} className="flex justify-between">
                      <span className="capitalize">{k}</span>
                      <span className="text-blue-400">{String(v)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 p-6 rounded-xl mt-4">
              <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                <Code size={18} /> Automated Analyst Recommendations
              </h3>
              <ul className="list-disc pl-5 text-blue-200 space-y-1">
                {(metrics.recommendations || []).map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </div>
      
      <footer className="pt-8 text-center text-zinc-500 text-sm">
        <p>Personal Assist operates 100% locally. No analytics, tracking, or private data leaves this machine.</p>
        {hasMetrics && <p className="mt-1">Last Analysis Run: {new Date(metrics.generatedAt).toLocaleString()}</p>}
      </footer>
    </div>
  );
}

function MetricCard({ title, value, icon }: { title: string, value: any, icon: any }) {
  return (
    <div className="bg-white/5 border border-white/10 p-5 rounded-xl flex items-center gap-4">
      <div className="p-3 bg-white/5 rounded-lg text-zinc-400">
        {icon}
      </div>
      <div>
        <p className="text-sm text-zinc-400">{title}</p>
        <p className="text-2xl font-bold text-white">{value ?? "-"}</p>
      </div>
    </div>
  );
}

function FlowCard({ title, flow }: { title: string, flow: string }) {
  return (
    <div className="bg-white/5 border border-white/10 p-4 rounded-xl">
      <h3 className="font-bold text-blue-300 mb-2">{title}</h3>
      <p className="text-zinc-300 text-sm font-mono leading-relaxed">{flow}</p>
    </div>
  );
}

// Minimal Icons
function MailIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg> }
function CalendarIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> }
function DocIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> }
function DraftIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg> }
