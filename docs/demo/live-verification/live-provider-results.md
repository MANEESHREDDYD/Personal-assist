# Live Provider Verification Results (Redacted)

Copy this file to `live-provider-results.md` and fill it in **after** running the live
tests. Keep everything sanitized -- placeholders only, no private data.

> An empty/blank template does **not** assert that live tests passed.

## Run details

- Date tested: `2026-06-10`
- Tester: `Codex local verification` (optional)
- Environment: `local dev`
- Commit hash tested: `57afd59d0ae8207aa93f7a0db954db3d0818526e`
- App URL: `http://127.0.0.1:3000`
- Gmail OAuth configured: no
- Outlook OAuth configured: no
- Gmail draft connector connected: no
- Outlook draft connector connected: no

## Gmail tests

| Check | Result |
|---|---|
| Create Gmail provider draft | not tested |
| Draft appears in Gmail Drafts | not tested |
| No email sent | not tested |
| Attach small file to Gmail draft | not tested |
| Gmail large attachment behavior | not tested |
| Duplicate Gmail attachment blocked | not tested |
| Audit + notification created | not tested |

## Outlook tests

| Check | Result |
|---|---|
| Create Outlook provider draft | not tested |
| Draft appears in Outlook Drafts | not tested |
| No email sent | not tested |
| Attach small file (<= 3 MB) | not tested |
| Attach large file (> 3 MB, <= 150 MB) via upload session | not tested |
| Block > 150 MB file | not tested |
| Duplicate Outlook attachment blocked | not tested |
| Audit + notification created | not tested |

## No-send compliance

| Check | Result |
|---|---|
| Sent folder checked (nothing sent) | no |
| Recipients did not receive email | no |
| `npm run security:no-send` passed | yes |
| `emails_sent` analytics remains 0 | yes |

## Evidence

- Redacted screenshots: `not included` (raw screenshots are gitignored -- keep local only)
- Notes:

```
Local verification gates passed on 2026-06-10:
- npm run security:no-send
- npm run security:demo-evidence
- npm run lint (exited 0 with existing warnings)
- npm run build
- npm run smoke:test
- npm run demo:provider-draft-fixture
- npm run test:provider-attachments
- npm run analytics:run

Local app reachability checked on 2026-06-10:
- /settings returned HTTP 200
- /drafts returned HTTP 200
- gmail_draft status: configured=false, redirectConfigured=false, encryptionKeyPresent=false, connected=false
- outlook_draft status: configured=false, redirectConfigured=false, encryptionKeyPresent=false, connected=false

Live Gmail/Outlook provider checks were not tested in this run because no safe test
OAuth client configuration, encryption key, or connected gmail_draft/outlook_draft
connector records were available locally. No provider mailbox was opened and no live
provider draft was created.
```

- Issues found:

```
Live Gmail and Outlook verification remain pending and require configured test OAuth
apps plus test Gmail and Outlook accounts.
```

- Follow-up actions:

```
Run the manual live verification checklist with test Gmail and Outlook accounts, then
update only sanitized pass/fail/not-tested results.
```
