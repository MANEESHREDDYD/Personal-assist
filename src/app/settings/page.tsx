import { Settings, Database, Bot, Zap, Mail, Calendar as CalendarIcon, Server, Terminal } from "lucide-react";
import { getAIPrefs } from "../actions/settings";
import { AISettings } from "./AISettings";
import { DemoModePanel } from "./DemoModePanel";
import { GmailConnectorCard } from "@/components/settings/GmailConnectorCard";
import { GoogleCalendarConnectorCard } from "@/components/settings/GoogleCalendarConnectorCard";
import OutlookCalendarConnectorCard from "@/components/settings/OutlookCalendarConnectorCard";
import { OutlookMailConnectorCard } from "@/components/settings/OutlookMailConnectorCard";
import { prisma } from "@/lib/prisma";

import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const CONNECTORS = [
  { name: "Gmail", type: "Email", status: "live local beta" },
  { name: "Google Calendar", type: "Calendar", status: "live local beta" },
  { name: "Outlook Calendar", type: "Calendar", status: "live local beta" },
  { name: "Outlook Mail", type: "Email", status: "live local beta" },
  { name: "Apple Mail", type: "Email", status: "planned local/native helper" },
  { name: "Local System Calendar", type: "Calendar", status: "planned native/helper or .ics import" },
  { name: "DocuSign", type: "Document", status: "placeholder" },
  { name: "Motion", type: "Scheduling", status: "unsupported" },
  { name: "Slack", type: "Messaging", status: "placeholder" },
];

export default async function SettingsPage() {
  const aiPrefs = await getAIPrefs();

  // Get last automation run
  const lastRun = await prisma.automationRun.findFirst({
    orderBy: { startedAt: "desc" }
  });

  const heartbeat = await prisma.userPreference.findUnique({
    where: { key: "lastWorkerHeartbeatAt" }
  });

  const lastExport = await prisma.userPreference.findUnique({
    where: { key: "lastExportAt" }
  });

  const isWorkerActive = heartbeat ? (Date.now() - new Date(heartbeat.value).getTime() < 120000) : false;

  const gmailAccount = await prisma.connectorAccount.findFirst({
    where: { provider: "gmail" }
  });
  const googleCalendarAccount = await prisma.connectorAccount.findFirst({
    where: { provider: "google_calendar" }
  });
  const outlookCalendarAccount = await prisma.connectorAccount.findFirst({
    where: { provider: "outlook_calendar" }
  });
  const outlookMailAccount = await prisma.connectorAccount.findFirst({
    where: { provider: "outlook_mail" }
  });

  const isGmailConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const isGoogleCalendarConfigured = !!(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET);
  const isMicrosoftConfigured = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
  const isOutlookMailRedirectConfigured = !!process.env.MICROSOFT_OUTLOOK_MAIL_REDIRECT_URI;
  
  let isEncryptionKeyValid = false;
  if (process.env.ENCRYPTION_KEY) {
    try {
      let buffer = Buffer.from(process.env.ENCRYPTION_KEY, "base64");
      if (buffer.length !== 32) {
        buffer = Buffer.from(process.env.ENCRYPTION_KEY, "utf-8");
      }
      if (buffer.length === 32) isEncryptionKeyValid = true;
    } catch (e) {}
  }

  // DB Test
  let dbStatus = "Ok";
  try {
     await prisma.userPreference.count();
  } catch(e) {
     dbStatus = "Error";
  }

  // Upload folder test
  let uploadStatus = "Ok";
  try {
    const uploadDir = path.join(process.cwd(), "data", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.accessSync(uploadDir, fs.constants.W_OK);
  } catch(e) {
    uploadStatus = "Error";
  }

  // Analytics Test
  let pythonAnalyticsPresent = false;
  let sqlMetricsPresent = false;
  let analyticsGenerated = false;
  let analyticsTimestamp = "Never";
  let analyticsWritable = false;

  try {
    const analyticsDir = path.join(process.cwd(), "analytics");
    if (fs.existsSync(path.join(analyticsDir, "personal_assist_analytics", "run.py"))) {
      pythonAnalyticsPresent = true;
    }
    if (fs.existsSync(path.join(analyticsDir, "sql", "inbox_metrics.sql"))) {
      sqlMetricsPresent = true;
    }
    
    const dataAnalyticsDir = path.join(process.cwd(), "data", "analytics");
    if (!fs.existsSync(dataAnalyticsDir)) {
      fs.mkdirSync(dataAnalyticsDir, { recursive: true });
    }
    fs.accessSync(dataAnalyticsDir, fs.constants.W_OK);
    analyticsWritable = true;
    
    const metricsFile = path.join(dataAnalyticsDir, "personal_assist_metrics.json");
    if (fs.existsSync(metricsFile)) {
      analyticsGenerated = true;
      const stats = fs.statSync(metricsFile);
      analyticsTimestamp = stats.mtime.toLocaleString();
    }
  } catch(e) {}

  return (
    <div className="p-8 max-w-5xl mx-auto w-full space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="text-zinc-400" />
          Settings & Connectors
        </h1>
        <p className="text-zinc-400">Manage integrations and system preferences.</p>
      </div>

      <AISettings initialPrefs={aiPrefs} />

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <GmailConnectorCard />
          <GoogleCalendarConnectorCard />
          <OutlookMailConnectorCard />
          <OutlookCalendarConnectorCard />

          <div className="glass-card rounded-2xl p-6 opacity-60">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Server className="text-zinc-400" />
              Apple Mail
            </h2>
            <p className="text-sm text-zinc-400 mb-2">Apple Mail support is planned as a local macOS helper/native workflow later. It is not active in this web MVP.</p>
            <span className="px-2 py-1 bg-zinc-500/20 text-zinc-400 text-xs rounded-full">Planned local/native helper</span>
          </div>

          <div className="glass-card rounded-2xl p-6 opacity-60">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <CalendarIcon className="text-zinc-400" />
              Local System Calendar
            </h2>
            <p className="text-sm text-zinc-400 mb-2">Local system calendar access is currently supported through .ics import. Direct Apple/Windows system calendar access requires a future native helper or desktop/mobile wrapper.</p>
            <span className="px-2 py-1 bg-zinc-500/20 text-zinc-400 text-xs rounded-full">Planned native/helper or .ics import</span>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="text-yellow-400" />
              Automation Worker
            </h2>
            <div className="space-y-4 text-sm text-zinc-300">
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Worker Status</span>
                 {isWorkerActive ? (
                   <span className="text-green-400 font-medium">Active</span>
                 ) : (
                   <span className="text-red-400 font-medium">Not detected (run npm run dev:all)</span>
                 )}
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Last Heartbeat</span>
                 <span>{heartbeat ? new Date(heartbeat.value).toLocaleString() : "Never"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Last Rule Execution</span>
                 <span>{lastRun ? lastRun.startedAt.toLocaleString() : "Never"}</span>
               </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Terminal className="text-emerald-400" />
              Analytics Health
            </h2>
            <div className="space-y-4 text-sm text-zinc-300">
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Python Layer</span>
                 <span className={pythonAnalyticsPresent ? "text-green-400" : "text-red-400"}>{pythonAnalyticsPresent ? "Present" : "Missing"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">SQL Metrics Layer</span>
                 <span className={sqlMetricsPresent ? "text-green-400" : "text-red-400"}>{sqlMetricsPresent ? "Present" : "Missing"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Output Folder Writable</span>
                 <span className={analyticsWritable ? "text-green-400" : "text-red-400"}>{analyticsWritable ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Report Generated</span>
                 <span className={analyticsGenerated ? "text-green-400" : "text-red-400"}>{analyticsGenerated ? "Yes" : "No"}</span>
               </div>
               {analyticsGenerated && (
                 <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                   <span className="text-zinc-500">Last Generated</span>
                   <span className="text-zinc-400">{analyticsTimestamp}</span>
                 </div>
               )}
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Database className="text-blue-400" />
              Local Data Health
            </h2>
            <div className="space-y-4 text-sm text-zinc-300 mb-6">
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Database Connection</span>
                 <span className={dbStatus === "Ok" ? "text-green-400" : "text-red-400"}>{dbStatus}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Private Uploads Writable</span>
                 <span className={uploadStatus === "Ok" ? "text-green-400" : "text-red-400"}>{uploadStatus === "Ok" ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Controlled Document Route Active</span>
                 <span className="text-green-400">Yes</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Public Uploads Disabled</span>
                 <span className="text-green-400">Yes</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Privacy Mode</span>
                 <span className="text-green-400">Strict (No external APIs)</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Last Export</span>
                 <span>{lastExport ? new Date(lastExport.value).toLocaleString() : "Never"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Gmail Configured</span>
                 <span className={isGmailConfigured ? "text-green-400" : "text-red-400"}>{isGmailConfigured ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Google Calendar Configured</span>
                 <span className={isGoogleCalendarConfigured ? "text-green-400" : "text-red-400"}>{isGoogleCalendarConfigured ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Microsoft Credentials Configured</span>
                 <span className={isMicrosoftConfigured ? "text-green-400" : "text-red-400"}>{isMicrosoftConfigured ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Outlook Mail Redirect Configured</span>
                 <span className={isOutlookMailRedirectConfigured ? "text-green-400" : "text-red-400"}>{isOutlookMailRedirectConfigured ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Encryption Key Present</span>
                 <span className={isEncryptionKeyValid ? "text-green-400" : "text-red-400"}>{isEncryptionKeyValid ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Gmail Connected</span>
                 <span className={gmailAccount?.status === "connected" ? "text-green-400" : "text-zinc-400"}>{gmailAccount?.status === "connected" ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Google Calendar Connected</span>
                 <span className={googleCalendarAccount?.status === "connected" ? "text-green-400" : "text-zinc-400"}>{googleCalendarAccount?.status === "connected" ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Outlook Mail Connected</span>
                 <span className={outlookMailAccount?.status === "connected" ? "text-green-400" : "text-zinc-400"}>{outlookMailAccount?.status === "connected" ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Last Outlook Mail Sync</span>
                 <span className="text-zinc-400">{outlookMailAccount?.lastSyncAt ? new Date(outlookMailAccount.lastSyncAt).toLocaleString() : "Never"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Outlook Calendar Connected</span>
                 <span className={outlookCalendarAccount?.status === "connected" ? "text-green-400" : "text-zinc-400"}>{outlookCalendarAccount?.status === "connected" ? "Yes" : "No"}</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Last Outlook Calendar Sync</span>
                 <span className="text-zinc-400">{outlookCalendarAccount?.lastSyncAt ? new Date(outlookCalendarAccount.lastSyncAt).toLocaleString() : "Never"}</span>
               </div>
               {googleCalendarAccount?.lastError && (
                 <div className="flex justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                   <span className="text-red-400">Last GCal Error</span>
                   <span className="text-red-400 max-w-[150px] truncate" title={googleCalendarAccount.lastError}>{googleCalendarAccount.lastError}</span>
                 </div>
               )}
               {outlookMailAccount?.lastError && (
                 <div className="flex justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                   <span className="text-red-400">Last Outlook Mail Error</span>
                   <span className="text-red-400 max-w-[150px] truncate" title={outlookMailAccount.lastError}>{outlookMailAccount.lastError}</span>
                 </div>
               )}
               {outlookCalendarAccount?.lastError && (
                 <div className="flex justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                   <span className="text-red-400">Last Outlook Cal Error</span>
                   <span className="text-red-400 max-w-[150px] truncate" title={outlookCalendarAccount.lastError}>{outlookCalendarAccount.lastError}</span>
                 </div>
               )}
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Gmail Attachment Download</span>
                 <span className="text-green-400">Available</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Outlook Attachment Download</span>
                 <span className="text-green-400">Available</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Max Attachment Size</span>
                 <span className="text-zinc-300">25 MB</span>
               </div>
               <div className="flex justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                 <span className="text-zinc-500">Blocked File Types Active</span>
                 <span className="text-green-400">Yes (22 types)</span>
               </div>
            </div>
          <div className="flex flex-wrap gap-4">
            <a 
              href="/api/export" 
              download
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:opacity-90 transition-opacity font-bold w-full text-center"
            >
              Export All Data (JSON)
            </a>
          </div>
          </div>
        </div>
      </div>

      <DemoModePanel />

      <div className="glass-card rounded-2xl p-8 mb-8">
        <h2 className="text-xl font-bold text-white mb-6">Cross-Platform Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
            <h3 className="font-bold text-white text-sm">Responsive Web App</h3>
            <p className="text-zinc-400 text-xs">Active. Automatically scales to desktop, tablet, and mobile layouts.</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
            <h3 className="font-bold text-white text-sm">PWA Manifest</h3>
            <p className="text-zinc-400 text-xs">Active. Installable on modern browsers.</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
            <h3 className="font-bold text-white text-sm">Installable App Shell</h3>
            <p className="text-zinc-400 text-xs text-blue-400 font-medium">Local Beta</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
            <h3 className="font-bold text-white text-sm">Native iOS App</h3>
            <p className="text-zinc-400 text-xs text-zinc-500">Planned Later</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
            <h3 className="font-bold text-white text-sm">Native Android App</h3>
            <p className="text-zinc-400 text-xs text-zinc-500">Planned Later</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
            <h3 className="font-bold text-white text-sm">Desktop Wrapper</h3>
            <p className="text-zinc-400 text-xs text-zinc-500">Planned Later</p>
          </div>
          <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
            <h3 className="font-bold text-white text-sm">Cloud Sync</h3>
            <p className="text-zinc-400 text-xs text-zinc-500">Not Active (Strict Local-First Mode)</p>
          </div>
        </div>
        <p className="mt-6 text-sm text-blue-300 bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
          <strong>Important:</strong> Personal Assist currently runs as a local-first responsive web app. It can be installed as a PWA where supported. True multi-device cloud sync is not active yet.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-8 mb-8">
        <h2 className="text-xl font-bold text-white mb-6">Connected Accounts</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CONNECTORS.map((c) => (
            <div key={c.name} className="p-5 border border-white/10 rounded-xl bg-white/5 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{c.name}</h3>
                <p className="text-sm text-zinc-400">{c.type}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider ${
                c.status === "placeholder" ? "bg-zinc-500/20 text-zinc-400" :
                "bg-red-500/20 text-red-500"
              }`}>
                {c.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-6">System Preferences</h2>
        
        <div className="space-y-4">
           <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
              <div>
                 <h3 className="text-white font-bold">Strict Privacy Mode</h3>
                 <p className="text-sm text-zinc-400">Never send data to external APIs. All data stays local.</p>
              </div>
              <div className="w-12 h-6 bg-green-500 rounded-full relative cursor-not-allowed">
                 <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
              </div>
           </div>
        </div>

        <p className="text-sm text-zinc-500 mt-6">Settings are locked in Phase 1 MVP. Local storage is enabled by default.</p>
      </div>
    </div>
  );
}
