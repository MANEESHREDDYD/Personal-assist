# Personal Assist

> Local-first AI personal operations system combining email/calendar ingestion, document intelligence, agentic workflows, Python analytics, SQL metrics, and approval-based automation.

## Technical Skills Demonstrated

| Domain | Implementation |
|--------|---------------|
| **Data Engineering** | OAuth ingestion pipelines (Gmail, Outlook), sync/deduplication, SQLite/Prisma data layer, SQL metric queries, Python analytics pipeline, data contract validation, lineage tracking |
| **Analytics Engineering** | SQL analytics marts, automated quality checks, metric aggregation, JSON/Markdown report generation, local analytics dashboard |
| **Data Science / AI** | Rules-based risk scoring, document classification, entity extraction, urgency/workload feature engineering, approval complexity analysis |
| **Gen AI** | Document summarization, draft generation via local LLM (Ollama), structured schema enforcement, provider-agnostic AI abstraction |
| **Agentic AI** | Multi-step workflow orchestration (ingest → classify → extract → draft → approve → export), human-in-the-loop approval gates, automation trigger rules |
| **Forward-Deployed Engineering** | Local-first architecture, zero-cost deployment, no cloud dependency, demo mode, user-ready workflows, private storage enforcement |
| **Backend Engineering** | OAuth 2.0 flows, AES-256 encrypted token storage, controlled API file serving, audit logging, automation worker |
| **Full Stack** | Next.js App Router, Prisma ORM, React Server Components, API routes, local background worker |
| **Frontend / UI** | PWA manifest, mobile-responsive glassmorphic design, command palette, Framer Motion animations |
| **Product Engineering** | Approval Center, draft export packages, manual send checklists, connector health monitoring, engineering showcase |

Visit [`/showcase`](/showcase) for live metrics and architecture details.

---

## Why This Project Is More Than a Frontend App

Personal Assist is a **data engineering and AI workflow system** that happens to have a web interface. The core value is in:

- **Real OAuth ingestion pipelines** — Gmail and Outlook read-only sync via Google APIs and Microsoft Graph
- **Python analytics package** — local SQLite analytics with SQL metrics, data quality checks, ML-style feature extraction, data contracts, and lineage graphs
- **Agentic workflow orchestration** — multi-step pipelines from email ingestion through document intelligence to approval-gated draft export
- **Document intelligence** — AI summarization, risk detection, deadline/party/payment extraction, action item identification
- **Human-in-the-loop automation** — approval gates, risk-level enforcement, no-send safety policy, audit trail
- **Secure local storage** — encrypted tokens, private file vault, controlled API serving, blocked executable extensions
- **Forward-deployed architecture** — runs entirely on one machine with zero cloud costs, zero paid APIs, zero telemetry

---

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Database Setup & Seed

```bash
npm run db:reset
```

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`.

### 4. Run Analytics Pipeline (Python)

```bash
npm run analytics:run
```

Generates `data/analytics/personal_assist_metrics.json` — viewable at `/showcase`.

### 5. Full Stack (Server + Worker)

```bash
npm run dev:all
```

### 6. Smoke Test

```bash
npm run smoke:test
```

### 7. Repository Language Breakdown

```bash
npm run repo:languages
```

---

## Architecture

### Data Flow

```
Gmail/Outlook OAuth → ConnectorAccount → InboxItem → AI Classification
                                              ↓
                              Attachment Download → Document → AI Extraction
                                                                    ↓
                                                        EmailDraft → ApprovalRequest → Export
```

```
Google/Outlook Calendar → CalendarEvent → WalletCard → Reminder → Daily Brief → Automation
```

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Data Pipeline | Python 3, SQLite, SQL metrics, Prisma ORM |
| AI / Intelligence | Rules engine, Ollama LLM integration, structured extraction |
| Backend | Next.js API routes, OAuth 2.0, AES-256 encryption |
| Automation | Local background worker, conditional trigger rules |
| Frontend | React, Tailwind CSS, Framer Motion, PWA |
| Analytics | Python reporting, SQL marts, data quality contracts |

---

## Integration Setup

### Gmail (Read-Only)
1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Gmail API, configure consent screen
3. Add redirect URI: `http://localhost:3000/api/integrations/gmail/callback`
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in `.env`
5. Generate encryption key: `openssl rand -base64 32` → set as `ENCRYPTION_KEY`

### Google Calendar (Read-Only)
1. Enable Google Calendar API (reuse project)
2. Add redirect URI: `http://localhost:3000/api/integrations/google-calendar/callback`
3. Set `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` in `.env`

### Outlook Calendar & Mail (Read-Only)
1. Create App Registration in [Microsoft Entra](https://entra.microsoft.com/)
2. Add delegated permissions: `User.Read`, `Calendars.Read`, `Mail.Read`, `offline_access`
3. Add redirect URIs for calendar and mail callbacks
4. Set `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` in `.env`

### Security Notes
- All connectors are **read-only** — the app cannot send, modify, or delete provider data
- OAuth tokens are **AES-256 encrypted** in local SQLite
- Attachments are stored in **private `data/uploads`**, served through controlled API routes
- Dangerous file extensions are **blocked** (22 types including `.exe`, `.bat`, `.ps1`, `.js`)

---

## Analytics & Data Engineering

The `analytics/` directory contains a Python data engineering pipeline:

```
analytics/
├── personal_assist_analytics/   # Python package
│   ├── agentic.py               # Agentic workflow analysis
│   ├── ai_eval.py               # AI output evaluation
│   ├── ml_features.py           # ML-style feature engineering
│   ├── data_contracts.py        # Schema contract validation
│   ├── lineage.py               # Data lineage graph
│   ├── marts.py                 # Analytics data marts
│   ├── metrics.py               # SQL metric aggregation
│   ├── quality.py               # Data quality checks
│   ├── risk.py                  # Risk distribution analysis
│   └── ...
├── sql/                         # SQL metric queries
│   ├── agentic_workflow_metrics.sql
│   ├── ai_extraction_metrics.sql
│   ├── data_quality_contracts.sql
│   ├── lineage_edges.sql
│   └── ...
└── sample_outputs/              # Sanitized example output
```

All analytics run **locally** against the SQLite database. No data leaves the machine. See `analytics/README.md` for details.

---

## Privacy & Safety

- **No telemetry** — zero external analytics or tracking
- **No cloud storage** — all data stays on the local filesystem
- **No email sending** — drafts are local-only, exported manually
- **No paid APIs** — entire system runs at zero cost
- **Strict no-send policy** — enforced at the API layer, verified in analytics

---

## GitHub Language Note

GitHub language stats are generated by GitHub Linguist and may emphasize TypeScript because the web layer is built with Next.js. The product scope is better represented by the architecture, analytics pipeline, and `/showcase` page. Run `npm run repo:languages` for a local breakdown.

---

## Roadmap

| Phase | Focus | Status |
|-------|-------|--------|
| 3E | Attachment download on demand + storage hardening | ✅ Complete |
| 3G | Safe draft export + repository cleanup | ✅ Complete |
| 3H-0.1 | Data/AI portfolio positioning + language balance hardening | ✅ Complete |
| 3H | Provider-side draft creation (approval-gated) | 🔜 Next |

**Phase 3H-0.1** strengthened the real Python analytics package, SQL metrics layer, agentic workflow analytics, AI evaluation with deterministic guardrails, data contracts, and lineage tracking — and repositioned the README and `/showcase` page to lead with Data Engineering, AI/ML, GenAI, Agentic AI, Analytics, and Forward-Deployed Engineering.

---

## License

Local development project. All rights reserved.
