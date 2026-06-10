# Phase 3I Demo Script — Provider Draft Attachment Workflow

A ~5-minute walkthrough of the human-in-the-loop agentic attachment workflow.
Everything is local. No email is ever sent.

## Setup (optional, offline-friendly)

```bash
npm run demo:provider-draft-fixture   # seeds a sanitized approved demo draft
npm run analytics:run                 # populates /showcase metrics (Python)
npm run dev                           # start the app
```

The fixture uses fake names/emails and a tiny demo attachment in the private
`data/uploads` vault. It also seeds **DEMO** provider-draft placeholders so the
dry-run **Validate Attachments** step works without any live email account.

## 5-minute demo flow

1. **Open the Engineering Showcase** (`/showcase`). Lead with the positioning:
   Data Engineering + AI + GenAI + Agentic Workflow + Forward-Deployed Engineering.
2. **Show analytics / no-send compliance.** Point to the "No-Send Compliance &
   Human-in-the-Loop Safety" section: `emails_sent: 0`, `no_send_compliance: 100%`,
   provider drafts created, attachment metrics.
3. **Open Drafts** (`/drafts`).
4. **Show the approved draft** — the `[DEMO] Phase 3I Provider Draft` with its
   risk badge and approved status.
5. **Show provider draft status** — the Provider-Side Draft Creation panel and the
   created Gmail/Outlook draft state.
6. **Validate local attachments** — select the demo document, click **Validate
   Attachments**. Explain this dry-run validates approval, provider-draft presence,
   file existence, the 3 MB limit, blocked extensions, and duplicate state, and
   **does not contact Gmail or Outlook or upload anything**.
7. **Upload a small attachment to the provider draft** — with a real draft connector
   connected, click **Attach to Gmail/Outlook Draft**. (Offline demo: stop at the
   dry-run; real upload requires live OAuth.)
8. **Show the audit log / notification** — open `/audit` to show the
   `provider_attachment_*` entries and the in-app notification.
9. **Explain the no-send policy and manual review** — Personal Assist creates and
   updates drafts only; the user reviews and sends manually from Gmail/Outlook.
   Mention `npm run security:no-send` as the static guard.
10. **Show the Python/SQL analytics folder and README positioning** —
    `analytics/personal_assist_analytics/`, `analytics/sql/`, and the README's
    "Technical Skills Demonstrated" + provider-draft sections.

## Recruiter talk track

> "This workflow demonstrates human-in-the-loop agentic automation: the system
> reasons over documents, generates a draft, requires approval, creates a provider
> draft, attaches approved documents, and still stops before sending. It's built
> local-first with a Python/SQL analytics layer, a no-send safety guard, encrypted
> OAuth token storage, and full auditability — the kind of forward-deployed,
> safety-first product engineering a Data/AI/GenAI engineer ships."

## Caveat

Live Gmail/Outlook verification requires user-owned OAuth credentials and should be
performed using [`docs/provider-draft-verification.md`](../provider-draft-verification.md).
Record outcomes in [`live-oauth-test-results-template.md`](./live-oauth-test-results-template.md).
