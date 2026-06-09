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
