# Phase 3J Demo Script — Large Attachment Upload Sessions

A short walkthrough of large provider-draft attachments. Everything is local and
**no email is ever sent**.

## Setup (offline-friendly)

```bash
npm run demo:provider-draft-fixture   # sanitized approved demo draft
npm run test:provider-attachments     # 12 local validation cases (no live OAuth)
npm run security:no-send              # static guard: no provider send endpoints
npm run analytics:run                 # populate /showcase metrics (Python)
npm run dev                           # start the app
```

## Demo flow

1. **Open Drafts** (`/drafts`) → the approved demo draft → **Attach Documents to
   Provider Draft**.
2. **Show dry-run size classification** — click **Validate Attachments**. Point out the
   per-file `sizeClass` (small / large / too_large) and `uploadMode`
   (simple / upload_session / deferred / blocked). No provider is contacted.
3. **Explain Outlook large attachment support** — files > 3 MB and ≤ 150 MB upload to the
   Outlook draft via **Microsoft Graph upload sessions** (chunked PUT with Content-Range);
   small files use a single simple upload.
4. **Explain why Gmail large attachments are conservative** — Gmail draft updates *replace*
   the draft via a full MIME rebuild, which is memory-heavy for large files, so large Gmail
   attachments are **deferred** (attach them manually in Gmail). Small Gmail attachments
   still work via MIME rebuild.
5. **Show no-send compliance** — `/showcase` → "No-Send Compliance" section: `emails_sent: 0`,
   100% compliance, and the Phase 3I/3J attachment metrics (uploaded, upload sessions, large
   blocked, deferred).
6. **Show local analytics** — `analytics/personal_assist_analytics/agentic.py` computes the
   attachment metrics from the audit trail; `analytics/sql/` holds the SQL layer.

## Talk track

> "Phase 3J adds resumable Microsoft Graph upload sessions for large Outlook draft
> attachments, while keeping the strict no-send, approval-gated, explicit-action workflow.
> The size policy, gating, and upload-mode selection are covered by a local integration test
> harness — backend/API engineering with forward-deployed safety design."

## Caveat

Live Gmail/Outlook verification requires user-owned OAuth credentials and should be run
using [`../provider-draft-verification.md`](../provider-draft-verification.md). The local
harness validates classification and gating only — it does not perform live uploads.
