# Provider Draft — Live OAuth Verification Checklist

Phase 3H lets an **approved** local draft be created as a **Gmail or Outlook draft**.
Personal Assist **never sends email** and **never uploads attachments** in this phase.

These steps require **live OAuth credentials** and your own mailboxes, so they must be
run manually. The `gmail.compose` and `Mail.ReadWrite` scopes are sensitive and require
Google / Microsoft app verification before use beyond test users.

> **No-send guarantee:** Personal Assist creates provider-side drafts only after local
> approval. The final send remains a human action inside Gmail or Outlook.

---

## Gmail Draft Verification

### Configuration
- [ ] Set `GOOGLE_GMAIL_DRAFT_CLIENT_ID`
- [ ] Set `GOOGLE_GMAIL_DRAFT_CLIENT_SECRET`
- [ ] Set `GOOGLE_GMAIL_DRAFT_REDIRECT_URI=http://localhost:3000/api/integrations/gmail-draft/callback`
- [ ] Set `ENCRYPTION_KEY` (32-byte base64 or 32-char string)
- [ ] In Google Cloud Console: Gmail API enabled, scope `https://www.googleapis.com/auth/gmail.compose`, redirect URI added

### Connect & create
- [ ] Open `/settings` → **Gmail Draft Creation** card shows **Configured** + **Encryption key present**
- [ ] Click **Connect Gmail Draft**, complete OAuth consent
- [ ] Card shows **Connected** with your account email
- [ ] Generate a local draft (from a Document, Inbox item, or **New Blank Draft**)
- [ ] Open `/drafts`, **Approve Locally** the draft
- [ ] In the **Provider-Side Draft Creation** panel, click **Create Gmail Draft**
- [ ] Success message appears; the button is replaced by **Gmail draft created**

### Confirm safety
- [ ] Open Gmail → **Drafts** folder → the draft is present with the footer
      *"Created as a draft by Personal Assist. Please review before sending."*
- [ ] Confirm **no email was sent** (nothing in Sent, no recipients received anything)
- [ ] Confirm **no attachments** were uploaded to the Gmail draft (Phase 3H is text-only)
- [ ] Click **Create Gmail Draft** flow again → duplicate creation is **blocked** (409, "already exists")
- [ ] Open `/audit` → an audit entry `gmail_provider_draft_created` exists
- [ ] A notification **"Gmail draft created"** appears in the app

---

## Outlook Draft Verification

### Configuration
- [ ] Set `MICROSOFT_CLIENT_ID`
- [ ] Set `MICROSOFT_CLIENT_SECRET`
- [ ] Set `MICROSOFT_OUTLOOK_DRAFT_REDIRECT_URI=http://localhost:3000/api/integrations/outlook-draft/callback`
- [ ] Set `MICROSOFT_TENANT=common`
- [ ] Set `ENCRYPTION_KEY`
- [ ] In Microsoft Entra: delegated permission `Mail.ReadWrite` (plus `User.Read`, `offline_access`), redirect URI added

### Connect & create
- [ ] Open `/settings` → **Outlook Draft Creation** card shows **Configured** + **Encryption key present**
- [ ] Click **Connect Outlook Draft**, complete OAuth consent
- [ ] Card shows **Connected** with your account email
- [ ] Generate a local draft
- [ ] Open `/drafts`, **Approve Locally** the draft
- [ ] In the **Provider-Side Draft Creation** panel, click **Create Outlook Draft**
- [ ] Success message appears; an **Open in Outlook** link is shown

### Confirm safety
- [ ] Open Outlook → **Drafts** folder → the draft is present with the footer
- [ ] Confirm **no email was sent**
- [ ] Confirm **no attachments** were uploaded (Phase 3H is text-only)
- [ ] Trigger **Create Outlook Draft** again → duplicate creation is **blocked** (409)
- [ ] Open `/audit` → an audit entry `outlook_provider_draft_created` exists
- [ ] A notification **"Outlook draft created"** appears in the app

---

## Cross-cutting checks
- [ ] Provider draft actions are **only** shown for `approved` drafts — not `draft`,
      `pending_approval`, `needs_changes`, or `rejected`
- [ ] The read-only `gmail` / `outlook_mail` connectors still work and are unaffected
- [ ] `EmailDraft.metadata` stores `providerDrafts`, `pushedToProvider: true`, and the
      provider draft IDs

---

## Automated local test harness (Phase 3I.2)

Before (or instead of) the manual live checklist, run the local validation harness.
It uses sanitized demo data and the shared validation module — **no Gmail/Outlook
calls, no OAuth, no sending**:

```bash
npm run test:provider-attachments
```

It asserts (exit 0 = all pass):

- Happy dry-run validates as uploadable, with **no metadata mutation**
- Duplicate attachment blocked (`already_attached`)
- Missing file blocked (`missing_file`)
- Blocked extension blocked (`.js` → `blocked_type`)
- Size limit blocked (> 3 MB → `too_large`)
- Pending/unapproved draft blocked (`not_approved`)
- Provider draft missing blocked (`provider_draft_missing`)

This is a **local** harness. The live OAuth checklist below remains separate and must
be run by the user with their own accounts.

### Local vs live — both are needed

- **Automated tests** ([`npm run test:provider-attachments`](../scripts/test-provider-attachments.ts))
  validate the **local gating**: size classification, upload-mode selection, duplicate/
  missing-file/blocked-extension handling, approval and provider-draft gates.
- **Live tests** validate real **provider behavior**: that drafts and attachments actually
  appear in Gmail/Outlook and that nothing is sent.
- For real confidence you need **both**. Capture live results safely with:
  - [`docs/demo/live-verification/live-provider-checklist.md`](demo/live-verification/live-provider-checklist.md)
  - [`docs/demo/live-verification/live-provider-results.template.md`](demo/live-verification/live-provider-results.template.md)

---

## Phase 3I — Attachment Upload Verification

Attachments can be uploaded to an **already-created** provider draft, for an **approved**
local draft, on explicit action. Personal Assist still never sends email and never uploads
attachments automatically. Phase 3I supports files **≤ 3 MB** only.

### Gmail / Outlook attachment checklist
- [ ] An approved local draft already has a Gmail or Outlook **provider draft**
- [ ] The draft has at least one **linked local document** (`data/uploads`)
- [ ] In `/drafts` → **Attach Documents to Provider Draft**, select a small document
- [ ] Click **Attach to Gmail Draft** / **Attach to Outlook Draft**
- [ ] Confirm the attachment appears in the draft inside Gmail/Outlook **Drafts**
- [ ] Confirm **no email was sent**
- [ ] Try attaching the **same document again** → blocked as **"Already attached"**
      (audit `provider_attachment_duplicate_blocked`)
- [ ] Try a document **> 3 MB** → blocked with the Phase 3J note
      (audit `provider_attachment_size_blocked`)
- [ ] Try a **blocked extension** (e.g. `.exe`) → blocked
      (audit `provider_attachment_type_blocked`)
- [ ] Attempt upload before approval / before a provider draft exists → blocked
- [ ] Confirm `EmailDraft.metadata.providerDrafts.{gmail|outlook}.attachments` is updated
- [ ] Confirm audit logs (`*_provider_attachment_uploaded`, `provider_attachment_upload_completed`)
- [ ] Confirm a notification (**"Attachment uploaded to … draft"**) appears
- [ ] Confirm **no absolute local paths** are returned by the API
- [ ] Gmail note: re-attaching rebuilds the draft from the approved local content — if you
      manually edited the Gmail draft, those edits may be overwritten

---

## Phase 3J — Large Attachment Verification (Outlook upload sessions)

Large attachments (`> 3 MB`, `<= 150 MB`) use Microsoft Graph upload sessions on the
Outlook draft. Gmail large files are deferred. Still no sending.

- [ ] Create an approved local draft
- [ ] Create a provider **Outlook** draft
- [ ] Attach a **~2 MB** file → uploads via the **simple** flow
- [ ] Attach a **~5 MB** file → uploads via the **upload session** flow
- [ ] Confirm both attachments are visible in the Outlook draft
- [ ] Confirm **no email was sent**
- [ ] Try a **> 150 MB** file → blocked (`too_large`)
- [ ] Try a **large Gmail** file → reported **deferred** (attach manually in Gmail)
- [ ] Confirm duplicate upload is blocked
- [ ] Confirm audit logs (`outlook_large_attachment_session_created`,
      `outlook_large_attachment_uploaded`, `provider_attachment_upload_completed`) and notifications
- [ ] Confirm `npm run security:no-send` still passes
- [ ] Confirm `EmailDraft.metadata` records `uploadMode` and `sizeClass` per attachment

> Tip: run `npm run test:provider-attachments` first — it validates the size
> classification and gating locally (no live OAuth) before you test for real.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `redirect_uri_mismatch` / invalid redirect URI | Redirect URI in the provider console differs from `*_REDIRECT_URI` | Make them identical, including `http://localhost:3000` and the exact callback path |
| Card shows "Missing ENCRYPTION_KEY" | `ENCRYPTION_KEY` unset or not 32 bytes | Set a 32-byte base64 (`openssl rand -base64 32`) or 32-char key |
| OAuth consent blocked / "app not verified" | Sensitive scope (`gmail.compose` / `Mail.ReadWrite`) not verified | Add your account as a test user, or complete app verification |
| Connect succeeds but creation fails with missing scopes | Wrong/partial scopes granted | Reconnect; ensure the exact scope/permission is requested and consented |
| Creation fails after some time (token refresh failure) | Refresh token missing or revoked | Disconnect and reconnect the draft connector to re-issue tokens |
| Draft creation returns 400 | Draft missing recipients/subject/body, or not approved | Ensure the draft is approved and has `to`, `subject`, and `body` |
| Draft creation returns 401/403 | Expired/invalid token or account permission restriction | Reconnect; check tenant/admin policy allows `Mail.ReadWrite` |
| Provider account restrictions (org policy) | Admin disables draft write or third-party apps | Use a permitted account or request admin approval |

All failures are written to the audit log (`provider_draft_creation_failed`) and surfaced
as a **"Provider draft creation failed"** notification — the app never crashes on an
OAuth denial or provider error.
