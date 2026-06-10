# Live OAuth Test Results — Provider Draft Attachment (Phase 3H / 3I)

Fill this in **after** running the live verification with your own accounts. Do **not**
commit credentials, tokens, private email content, private file paths, or un-redacted
screenshots. Redact account names (e.g. `a***@gmail.com`).

> These results reflect a manual run by the tester. An empty/blank template does **not**
> assert that live tests passed.

---

## Test run

- Date tested: `____-__-__`
- Tester: `__________` (optional)
- App version / commit: `__________`

## Accounts (redacted)

- Gmail account used: `a***@gmail.com`
- Outlook account used: `a***@outlook.com`

## Gmail

| Check | Result |
|---|---|
| Gmail draft created | yes / no |
| Gmail attachment visible in draft | yes / no |
| Gmail email sent automatically | **no** (expected) |
| Attachment ≤ 3 MB uploaded | yes / no |

## Outlook

| Check | Result |
|---|---|
| Outlook draft created | yes / no |
| Outlook attachment visible in draft | yes / no |
| Outlook email sent automatically | **no** (expected) |
| Attachment ≤ 3 MB uploaded | yes / no |

## Safety / guard behavior

| Check | Result |
|---|---|
| Duplicate upload blocked | yes / no |
| > 3 MB file blocked | yes / no |
| Blocked extension blocked | yes / no |
| Dry-run did not contact provider / mutate state | yes / no |
| Audit logs written | yes / no |
| Notifications created | yes / no |
| No absolute local paths exposed by API | yes / no |

## Evidence

- Screenshots captured: yes / no (redacted, **not committed** with private data)
- Storage location (local only, not in repo): `__________`

## Notes / issues

```
(Record any anomalies, provider errors, scope/consent issues, or follow-ups here.)
```
