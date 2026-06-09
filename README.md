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

### 8. Lint & No-Send Guard

```bash
npm run lint            # ESLint flat config (eslint .)
npm run security:no-send  # fails if any provider send endpoint appears in src/
```

> Note: `next lint` was removed in Next 16, so `npm run lint` runs ESLint directly.

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
- Read-only connectors (`gmail`, `outlook_mail`, calendars) **cannot** send, modify, or delete provider data
- Draft-creation connectors (Phase 3H) can create provider-side drafts **only** — they never send
- OAuth tokens are **AES-256 encrypted** in local SQLite, stored server-side, never exposed to the browser or logged
- Attachments are stored in **private `data/uploads`**, served through controlled API routes
- Dangerous file extensions are **blocked** (22 types including `.exe`, `.bat`, `.ps1`, `.js`)

---

## Provider-Side Draft Creation (Phase 3H)

Personal Assist can create a **Gmail or Outlook draft** from an approved local draft — and nothing more.

> **No-send guarantee:** Personal Assist can create provider-side drafts only after approval. It does **not** send emails. You must review and send manually from Gmail or Outlook. Provider-side draft creation requires broader OAuth permissions than read-only access.

These draft connectors are **separate** from the read-only connectors, with their own OAuth clients, scopes, and `ConnectorAccount` records (`gmail_draft`, `outlook_draft`). The read-only `gmail` and `outlook_mail` connectors are unchanged.

**What it does:** creates a text-only draft (To/CC/BCC, subject, body) in your mailbox's Drafts folder, after you locally approve the draft, via an explicit button press.

**What it never does:** send email, upload attachments (Phase 3I), modify/delete/move existing messages, change labels/categories, or mark messages read/unread.

### Gmail Draft connector

1. Create a separate OAuth client in [Google Cloud Console](https://console.cloud.google.com/) with the Gmail API enabled.
2. Add redirect URI: `http://localhost:3000/api/integrations/gmail-draft/callback`
3. Set in `.env`:
   - `GOOGLE_GMAIL_DRAFT_CLIENT_ID`
   - `GOOGLE_GMAIL_DRAFT_CLIENT_SECRET`
   - `GOOGLE_GMAIL_DRAFT_REDIRECT_URI=http://localhost:3000/api/integrations/gmail-draft/callback`
4. Required scope: `https://www.googleapis.com/auth/gmail.compose`

> ⚠️ This permission can manage Gmail drafts and has broader mailbox capability. Personal Assist only creates drafts and never sends emails.

### Outlook Draft connector

1. Reuse your Microsoft app registration; add the delegated permission `Mail.ReadWrite` (plus `User.Read`, `offline_access`).
2. Add redirect URI: `http://localhost:3000/api/integrations/outlook-draft/callback`
3. Set in `.env`:
   - `MICROSOFT_OUTLOOK_DRAFT_REDIRECT_URI=http://localhost:3000/api/integrations/outlook-draft/callback`
   - reuses `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT=common`, `ENCRYPTION_KEY`
4. Required permission: `Mail.ReadWrite`

> ⚠️ This permission allows creating/updating mailbox drafts. Personal Assist only creates drafts and never sends emails.

### Attachment upload (Phase 3I)

Approved drafts that already have a provider draft can have **selected local documents
uploaded as attachments** to the Gmail/Outlook draft, on explicit user action.

- **3 MB MVP limit per file.** Outlook simple file attachments and Gmail MIME draft
  updates stay reliable under this size; **large attachments require upload sessions, which
  are deferred to Phase 3J**.
- **Gmail draft update behavior:** Gmail draft update *replaces* the draft message, so
  Personal Assist rebuilds it from the approved local content plus the full attachment set.
  If you manually edited the Gmail draft after creation, re-attaching may overwrite those
  edits — a warning is shown in the UI.
- **Outlook small attachment behavior:** files are added incrementally via the Graph
  message `attachments` collection (`#microsoft.graph.fileAttachment`).
- **No-send guarantee holds:** attachment upload updates the draft only; no send endpoint
  is ever called. **Review attachments manually inside Gmail/Outlook before sending.**
- Blocked executable extensions and path-traversal-unsafe filenames are rejected. Files are
  read from the **private `data/uploads`** vault; local paths are never exposed. This is a
  safety convenience, **not a malware scan** — no malware-scanning claim is made.

### Limitations & verification

- Provider drafts are created **text-first**; attachments are uploaded separately (above).
- After creation, **review the draft inside your email provider before sending**. Sending is always a manual, human action outside Personal Assist.
- Production OAuth verification: the `gmail.compose` and `Mail.ReadWrite` scopes are sensitive and require Google/Microsoft app verification before use beyond test users.

### Why this demonstrates agentic AI + forward-deployed engineering

This closes a real agentic loop — *document intelligence → local draft → human approval → provider-side draft* — while keeping a human in control at the send boundary. It is forward-deployed because it runs locally, expands permissions safely and explicitly, isolates OAuth scopes, encrypts tokens, and audits every action, rather than silently automating outbound email.

### Verification & no-send policy (Phase 3H.1)

- **Live OAuth verification checklist:** [`docs/provider-draft-verification.md`](docs/provider-draft-verification.md) — step-by-step Gmail/Outlook manual tests plus troubleshooting.
- **No-send policy:** [`docs/security/no-send-policy.md`](docs/security/no-send-policy.md) — the authoritative list of allowed and forbidden provider endpoints.
- **Static guard:** `npm run security:no-send` scans `src/` and fails if any provider send endpoint (`users.drafts.send`, `users.messages.send`, `sendMail`, `/send`, …) is reintroduced.
- **Live no-send evidence:** the `/showcase` page surfaces `emails_sent: 0`, no-send compliance, provider drafts created, creation failures, and approval→draft conversion from the analytics pipeline.

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
| 3G | Safe draft export + manual send package | ✅ Complete |
| 3G.1 | Repository hygiene + GitHub sync | ✅ Complete |
| 3H-0 | Data engineering + analytics showcase layer | ✅ Complete |
| 3H-0.1 | Data/AI portfolio positioning + language balance hardening | ✅ Complete |
| 3H | Provider-side draft creation after approval | ✅ Complete |
| 3H.1 | Lint repair + live OAuth verification + no-send compliance evidence | ✅ Complete |
| 3I | Provider draft attachment upload after approval (≤ 3 MB) | ✅ Current |
| 3J | Large attachment upload sessions | 🔜 Next |
| — | Apple Mail / Apple Calendar native-helper planning | 🔭 Planned |
| — | Local system calendar bridge planning | 🔭 Planned |
| — | Optional desktop wrapper | 🔭 Planned |

**Phase 3I** adds approval-gated **attachment upload** from the private document vault to an existing Gmail/Outlook draft (≤ 3 MB), with dedup, blocked-extension/size guards, full audit logging, and the no-send guarantee intact. Large upload sessions are deferred to Phase 3J.

**Phase 3H.1** repaired the lint workflow (`eslint .`), added a [live OAuth verification checklist](docs/provider-draft-verification.md) and a [no-send policy doc](docs/security/no-send-policy.md) with a `npm run security:no-send` static guard, and surfaced no-send compliance evidence (`emails_sent: 0`, 100% compliance) on `/showcase`.

**Phase 3H** lets approved local drafts become Gmail/Outlook **drafts** (never sent), via isolated `gmail_draft` / `outlook_draft` OAuth connectors with encrypted tokens and full audit logging — a real human-in-the-loop agentic workflow with a strict no-send boundary.

**Phase 3H-0.1** strengthened the real Python analytics package, SQL metrics layer, agentic workflow analytics, AI evaluation with deterministic guardrails, data contracts, and lineage tracking — and repositioned the README and `/showcase` page to lead with Data Engineering, AI/ML, GenAI, Agentic AI, Analytics, and Forward-Deployed Engineering.

---

## License

Local development project. All rights reserved.
