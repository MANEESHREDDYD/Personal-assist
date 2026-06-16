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
