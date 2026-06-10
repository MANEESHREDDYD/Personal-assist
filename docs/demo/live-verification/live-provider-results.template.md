# Live Provider Verification Results (Redacted)

Copy this file to `live-provider-results.md` and fill it in **after** running the live
tests. Keep everything sanitized — placeholders only, no private data.

> An empty/blank template does **not** assert that live tests passed.

## Run details

- Date tested: `____-__-__`
- Tester: `__________` (optional)
- Environment: `local dev` / `__________`
- Commit hash tested: `__________`
- App URL: `http://localhost:3000`
- Gmail OAuth configured: yes / no
- Outlook OAuth configured: yes / no
- Gmail draft connector connected: yes / no
- Outlook draft connector connected: yes / no

## Gmail tests

| Check | Result |
|---|---|
| Create Gmail provider draft | pass / fail / not tested |
| Draft appears in Gmail Drafts | pass / fail / not tested |
| No email sent | pass / fail / not tested |
| Attach small file to Gmail draft | pass / fail / not tested |
| Gmail large attachment behavior | deferred / supported / fail / not tested |
| Duplicate Gmail attachment blocked | pass / fail / not tested |
| Audit + notification created | pass / fail / not tested |

## Outlook tests

| Check | Result |
|---|---|
| Create Outlook provider draft | pass / fail / not tested |
| Draft appears in Outlook Drafts | pass / fail / not tested |
| No email sent | pass / fail / not tested |
| Attach small file (≤ 3 MB) | pass / fail / not tested |
| Attach large file (> 3 MB, ≤ 150 MB) via upload session | pass / fail / not tested |
| Block > 150 MB file | pass / fail / not tested |
| Duplicate Outlook attachment blocked | pass / fail / not tested |
| Audit + notification created | pass / fail / not tested |

## No-send compliance

| Check | Result |
|---|---|
| Sent folder checked (nothing sent) | yes / no |
| Recipients did not receive email | yes / no |
| `npm run security:no-send` passed | yes / no |
| `emails_sent` analytics remains 0 | yes / no |

## Evidence

- Redacted screenshots: `not included` (raw screenshots are gitignored — keep local only)
- Notes:

```
(Redacted notes only — no private inboxes, names, emails, subjects, or file contents.)
```

- Issues found:

```
```

- Follow-up actions:

```
```
