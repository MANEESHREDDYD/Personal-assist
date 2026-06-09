# No-Send Policy (Phase 3H)

Personal Assist **creates provider-side drafts only**. It must **never send email**,
modify, move, or delete mailbox messages. This document is the authoritative list of
allowed and forbidden provider endpoints, and is enforced by a static guard.

> Policy: no provider **send** endpoint may appear anywhere in application source
> (`src/`). Send-endpoint strings may appear **only** in documentation and tests, as
> *forbidden references*. The guard `scripts/check-no-send-policy.mjs`
> (`npm run security:no-send`) scans `src/` and fails if any forbidden token is found.

---

## Allowed provider endpoints in Phase 3H

| Provider | Endpoint | Purpose |
|---|---|---|
| Gmail | `POST https://gmail.googleapis.com/gmail/v1/users/me/drafts` (users.drafts.create) | Create a draft |
| Gmail | `GET .../users/me/profile` | Read account email after OAuth |
| Gmail | OAuth token endpoints (`oauth2.googleapis.com/token`) | Exchange/refresh tokens |
| Outlook | `POST https://graph.microsoft.com/v1.0/me/messages` | Create a draft message |
| Outlook | `GET https://graph.microsoft.com/v1.0/me` | Read account profile after OAuth |
| Outlook | Microsoft identity token endpoints | Exchange/refresh tokens |

Read-only connectors (`gmail`, `outlook_mail`, calendars) continue to use their
existing read-only endpoints and are unchanged.

### Allowed provider draft attachment operations (Phase 3I)

Attachment upload is allowed **only to draft messages**, **only after local approval**,
and **only on explicit user action**. None of these endpoints send email.

| Provider | Endpoint | Purpose |
|---|---|---|
| Gmail | `PUT .../users/me/drafts/{id}` (users.drafts.update) | Replace the draft with a multipart MIME message carrying attachments |
| Outlook | `POST https://graph.microsoft.com/v1.0/me/messages/{id}/attachments` | Add a small (`<= 3 MB`) file attachment to a draft message |

Phase 3I uses simple/small attachments only (`<= 3 MB`). Large attachment **upload
sessions** are deferred to Phase 3J. Attachment upload never sends, moves, deletes, or
re-labels any message, and never touches inbox messages.

---

## Explicitly forbidden endpoints

### Gmail — forbidden
- `users.drafts.send`
- `users.messages.send`
- any message **modify** / **label** endpoints (e.g. `users.messages.modify`,
  `users.threads.modify`, label add/remove)
- trash / delete endpoints

### Outlook (Microsoft Graph) — forbidden
- `/send` (e.g. `/me/messages/{id}/send`)
- `sendMail` (`/me/sendMail`)
- message **update** (PATCH `/me/messages/{id}`)
- message **move** (`/me/messages/{id}/move`)
- message **delete** (DELETE `/me/messages/{id}`)
- category changes on existing messages

---

## Enforcement

1. **Static guard** — `scripts/check-no-send-policy.mjs` scans `src/` for the forbidden
   tokens `users.drafts.send`, `users.messages.send`, `drafts.send`, `messages.send`,
   `sendMail`, `/send`. Run via `npm run security:no-send`. Exit code `1` on any hit.
2. **Connector isolation** — draft connectors (`gmail_draft`, `outlook_draft`) use
   separate OAuth clients/scopes and `ConnectorAccount` records, isolated from
   read-only connectors.
3. **Approval gate** — provider drafts can only be created from a locally **approved**
   `EmailDraft`, on explicit user action, never automatically.
4. **Audit + analytics** — every creation, duplicate-block, and failure is logged;
   analytics reports `emails_sent: 0` and `no_send_compliance: 100%`.

The forbidden tokens above are *documentation references* and are expected here; the
guard only scans `src/`, so this file does not trip it.
