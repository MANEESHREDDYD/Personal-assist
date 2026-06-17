# Final Manual Product Test Checklist — Personal Assist

A complete, user-facing manual test plan for verifying Personal Assist locally. Personal
Assist is **local-first** and **never sends email** — it only creates provider-side
**drafts** after explicit approval. Everything below runs at zero cost on one machine.

> Live Gmail/Outlook verification (Section 8) is optional and requires **your own** test
> OAuth credentials. No live success is claimed until you record real evidence.

---

## 1. Local setup

```bash
npm install
npm run db:reset        # resets local SQLite + seeds demo data
npm run analytics:run   # generates data/analytics/personal_assist_metrics.json
npm run dev:safe        # starts the managed dev server (writes .tmp PID)
```

Open `http://127.0.0.1:3000`.

- [ ] `npm install` completes
- [ ] `db:reset` seeds without error
- [ ] `analytics:run` prints "Pipeline complete"
- [ ] dev server starts and the home page loads

## 2. Core app

- [ ] `/onboarding` — wizard renders; can pick Demo Mode or Empty Workspace
- [ ] `/` — dashboard loads with seeded data / brief
- [ ] Command palette opens (keyboard shortcut) and navigates
- [ ] `/search` — query ≥ 2 chars returns results across cards/docs/inbox/contacts
- [ ] `/roadmap` — shows the product is complete through Phase 3J; live verification pending
- [ ] `/showcase` — analytics metrics render; live-verification status shows **pending** (until evidence recorded)

## 3. Documents

- [ ] `/documents` — upload or import a demo document
- [ ] Open the document workspace; inspect AI summary / extraction / intelligence tabs
- [ ] Generate a draft from the document
- [ ] Edit the draft (redline / edit studio)
- [ ] Move the draft through the approval flow

## 4. Inbox

- [ ] `/inbox` — demo inbox items render
- [ ] Items show classification + confidence
- [ ] Action / draft generation works from an inbox item
- [ ] A draft created from an inbox item appears in `/drafts`

## 5. Calendar / contacts / followups / automations

- [ ] `/calendar` — page loads; import a demo `.ics` if available
- [ ] `/contacts` — list + detail pages load
- [ ] `/followups` — page loads; follow-ups render
- [ ] `/automations` — page loads; "Reset Default Rules" / "Run Automations Now" work
- [ ] `/reminders` — reminders render and can be created where supported

## 6. Draft workflow (local only)

- [ ] Create a local draft
- [ ] Approve the draft (`/approvals`)
- [ ] Export TXT (`/api/drafts/[id]/export/txt`)
- [ ] Export EML (`/api/drafts/[id]/export/eml`)
- [ ] Mark exported / manual-sent if applicable
- [ ] Confirm audit entries appear in `/audit`

## 7. Provider workflow WITHOUT OAuth (default safe state)

- [ ] `/settings` — Gmail/Outlook connector cards show **not configured** when env is missing
- [ ] Draft connector cards explain drafts-only / no-send
- [ ] Run dry-run attachment validation (Validate Attachments button or `?dryRun=true`)
- [ ] Confirm dry-run reports outcomes **without** contacting Gmail/Outlook
- [ ] Confirm **no** live success is shown anywhere

## 8. Provider workflow WITH OAuth (optional — your own test accounts)

```bash
# Edit local .env (never commit it):
#   ENCRYPTION_KEY=<openssl rand -base64 32>
#   GOOGLE_GMAIL_DRAFT_CLIENT_ID / _SECRET / _REDIRECT_URI
#   MICROSOFT_CLIENT_ID / _SECRET / MICROSOFT_TENANT=common / MICROSOFT_OUTLOOK_DRAFT_REDIRECT_URI
npm run verify:live-provider-env   # must report READY before continuing
```

See [`oauth-test-setup.md`](live-verification/oauth-test-setup.md) for Google Cloud /
Microsoft Entra setup.

- [ ] Preflight reports READY
- [ ] Connect Gmail Draft connector; card shows connected
- [ ] Create a Gmail provider draft from an approved draft
- [ ] Confirm the draft appears in Gmail **Drafts**
- [ ] Confirm **nothing** appears in Gmail **Sent**
- [ ] Connect Outlook Draft connector; card shows connected
- [ ] Create an Outlook provider draft; confirm it appears in Outlook **Drafts**
- [ ] Attach a small file (≤ 3 MB) to the Outlook draft; confirm it appears
- [ ] Attach a large file (> 3 MB, ≤ 150 MB); confirm Outlook upload-session attachment appears
- [ ] Confirm a > 150 MB file is blocked
- [ ] Confirm Gmail large attachments are reported **deferred** (attach manually in Gmail)
- [ ] Confirm duplicate draft/attachment blocking
- [ ] Confirm **nothing** in Sent for either provider
- [ ] Update sanitized [`live-provider-results.md`](live-verification/live-provider-results.md) (pass/fail/not-tested, placeholders only)

## 8b. Scheduling & booking (Phase 6A–6B)

Scheduling:
- [ ] `/availability` — set timezone + working hours; save
- [ ] `/availability/rules` — add a do-not-schedule or lunch window
- [ ] `/scheduling` — set buffers/notice/max-per-day; **Preview** finds free slots respecting them
- [ ] Click **Propose write** on a slot → a request appears in `/calendar/write-requests` (pending)
- [ ] Approve then **Execute** → a local hold is created; status shows executed/local
- [ ] `/calendar/planner` — the hold and meeting-load appear; `npm run test:scheduling` passes
- [ ] Confirm **no** external calendar event was created and **no** notification was sent

Booking (Calendly-style):
- [ ] `/booking/admin/meeting-types` — create a meeting type (e.g. "Intro Call", 30 min)
- [ ] Add a required question and a routing rule
- [ ] Open the local booking link `/booking/[slug]` → **View available times**
- [ ] Pick a slot, fill name + answers, **Request this time**
- [ ] `/booking/requests` — the request is **pending**; open detail to see answers + routing
- [ ] **Approve** → confirm a linked **calendar write request** is created and a **local
      confirmation draft** appears (subject says "Confirmed", body says "NOT sent")
- [ ] **Reject** another request → confirm **no** calendar write request is created
- [ ] `npm run test:booking` passes; `bookingMetrics.auto_confirmations_sent = 0` and
      `provider_events_written_from_booking = 0` in the analytics JSON

## 8c. AI scheduling secretary (Phase 6C)

- [ ] `/assistant/scheduling` — enter "schedule 30 minutes with Alex next week" → **Parse request**
- [ ] Conversation page shows parsed intent (schedule, 30 min, participant Alex, next-week range)
- [ ] **Generate candidate slots** → ranked slots appear (from your working hours/buffers)
- [ ] **Propose-times draft** → a local draft listing times, footer says "NOT sent"
- [ ] **Save as local draft** → appears in `/drafts` (status draft)
- [ ] Select a slot → **Create calendar write request** → links an approval-gated request
- [ ] Approve + execute it in `/calendar/write-requests` → local hold only
- [ ] **Track follow-up** → appears in `/assistant/scheduling/follow-ups`
- [ ] `/assistant/scheduling/inbox` — "Schedule from this email" seeds a conversation (read-only)
- [ ] `npm run test:scheduling-secretary` passes; analytics `schedulingSecretaryMetrics`
      `emails_sent_by_secretary = 0` and `provider_events_written_by_secretary = 0`

## 8d. Smart planner & focus optimizer (Phase 6D)

- [ ] `/tasks` — create a few tasks with priority/due/estimate
- [ ] `/habits` — create a habit (e.g. daily reading, 07:00–09:00)
- [ ] `/focus` — set weekly focus goal + min block; save
- [ ] `/optimizer` — **Run day optimization** → opens the run with proposals
      (scheduled tasks, focus blocks, habits; flexible-meeting moves if overloaded)
- [ ] Run summary shows meeting load, planned focus, tasks scheduled/unscheduled, burnout risk
- [ ] **Approve** a proposal → confirm a calendar write request is created (`/calendar/write-requests`)
- [ ] **Reject** a proposal → confirm no calendar write request is created
- [ ] Approve + execute the write request → local hold only; appears in `/planner/day`
- [ ] `/weekly-review` — **Generate weekly review** → focus coverage, fragmented days, risk
- [ ] `npm run test:planner` passes; analytics `plannerMetrics`
      `provider_events_written_by_planner = 0` and `emails_sent_by_planner = 0`

## 8e. AI project manager (Phase 6E)

- [ ] `/projects` — create from a goal (e.g. "Build a portfolio website in two weeks")
- [ ] Project decomposes into stages + tasks with estimates, due dates, dependencies
- [ ] `/projects/[id]/tasks` — add a task; change status; add a dependency (cycle is rejected)
- [ ] **Send open tasks to planner** → tasks become PlannerTasks; schedule them in `/optimizer` (approval-gated)
- [ ] `/projects/[id]/risks` — **Re-score risks** → deadline/blocked/owner/coverage findings
- [ ] `/projects/[id]/workload` — **Run forecast** → estimate vs scheduled hours + delay risk
- [ ] `/projects/[id]/status` — generate a status / brief / decision-memo draft (footer says "not sent")
- [ ] `/projects/[id]/documents` — link a local document/note
- [ ] `npm run test:projects` passes; analytics `projectMetrics`
      `provider_events_written_by_projects = 0` and `emails_sent_by_projects = 0`

## 8f. Local agreement & e-signature workflow (Phase 6F)

> Honest framing: local agreement workflow / audit-friendly signing simulation —
> **not legally binding, not a DocuSign replacement, not legal advice.**

- [ ] `/agreements/templates` — **Load starter templates**, then **Use template** (or create one with text)
- [ ] `/agreements/[id]/prepare` — add recipients (routing order) + a signature field; **Prepare & open local signing**
- [ ] `/agreements/[id]/sign` — second signer is blocked until the first signs (order enforced)
- [ ] Complete required fields (typed signature, date), then **Sign** → status moves to partially/completed
- [ ] `/agreements/[id]/risks` — **Extract clauses** (renewal/effective/parties/Net 30) + **Score risks**
- [ ] `/agreements/[id]/qa` — ask "when does it renew?" → cited answer with "not legal advice"
- [ ] `/agreements/[id]/certificate` — **Certificate** → SHA-256 original/final hashes + audit timeline (JSON + MD), with disclaimers
- [ ] Overview — **Reminder draft** is created locally (footer "NOT sent")
- [ ] `npm run test:agreements` passes; analytics `agreementMetrics`
      `emails_sent_by_agreements = 0`, `provider_events_written_by_agreements = 0`, `legal_binding_claims_made = 0`

## 9. Safety checks

```bash
npm run security:no-send          # must PASS — no send endpoints in src/
npm run security:demo-evidence    # must PASS — no raw screenshots/secrets tracked
npm run test:provider-attachments # 12/12 pass
npm run analytics:run             # confirm emails_sent = 0
```

- [ ] `security:no-send` PASS
- [ ] `security:demo-evidence` PASS
- [ ] provider attachment harness 12/12
- [ ] `emails_sent` = 0 in `data/analytics/personal_assist_metrics.json`

## 10. Cleanup

```bash
npm run dev:stop   # stops ONLY this repo's managed dev server
git status
```

- [ ] dev server stopped (does not kill unrelated Next.js servers)
- [ ] `git status` clean
- [ ] No `.env`, `dev.db`, `data/uploads`, `data/analytics` output, tokens, or screenshots staged

---

## Expected verification summary (local, no OAuth)

| Gate | Expected |
|---|---|
| `npm run build` | pass, 0 type errors |
| `npm run lint` | 0 errors (≈37 non-blocking warnings) |
| `npm run security:no-send` | PASS |
| `npm run security:demo-evidence` | PASS |
| `npm run smoke:test` | PASS |
| `npm run test:provider-attachments` | 12/12 |
| `npm run analytics:run` | pass, `emails_sent = 0` |
| `npm run verify:live-provider-env` | NOT READY until you add OAuth credentials (expected) |
