# OAuth Test Setup for Live Provider Verification

Use this guide only with test Gmail and Outlook/Microsoft accounts. Do not use private
mailboxes or real sensitive documents. Personal Assist creates provider drafts only and
never sends email.

## Local Environment

1. Copy `.env.example` to `.env`.
2. Fill only local test credentials in `.env`.
3. Set `ENCRYPTION_KEY` to a 32-byte base64 value or a 32-character string.
4. Run `npm run verify:live-provider-env`.
5. Start the app with `npm run dev:safe`.
6. Stop the app with `npm run dev:stop`.

Never commit `.env`, provider secrets, tokens, screenshots, private email addresses, or
provider mailbox contents.

## Google Cloud - Gmail Draft Connector

1. Create or select a Google Cloud project for testing.
2. Enable the Gmail API.
3. Configure the OAuth consent screen.
4. Add your test Gmail account as a test user if the app is not verified.
5. Create an OAuth client for a web application.
6. Add this redirect URI exactly:

```text
http://localhost:3000/api/integrations/gmail-draft/callback
```

7. Add the Gmail Draft connector values to `.env` using the exact keys shown in
   `.env.example`. Keep secret values local.

```text
GOOGLE_GMAIL_DRAFT_REDIRECT_URI=http://localhost:3000/api/integrations/gmail-draft/callback
```

Required Gmail scope:

```text
https://www.googleapis.com/auth/gmail.compose
```

This scope can manage Gmail drafts and is broader than read-only access. Use a test
account and verify that no message is sent.

## Microsoft Entra - Outlook Draft Connector

1. Create or select an app registration in Microsoft Entra.
2. Configure it for delegated permissions.
3. Add this redirect URI exactly:

```text
http://localhost:3000/api/integrations/outlook-draft/callback
```

4. Add delegated permissions:

```text
User.Read
offline_access
Mail.ReadWrite
```

5. Add the Microsoft app values to `.env` using the exact keys shown in `.env.example`.
   Keep secret values local.

```text
MICROSOFT_TENANT=common
MICROSOFT_OUTLOOK_DRAFT_REDIRECT_URI=http://localhost:3000/api/integrations/outlook-draft/callback
```

`Mail.ReadWrite` allows creating and updating mailbox drafts. Personal Assist uses it
only for drafts and attachments; it does not call send endpoints.

## Redirect URI Checklist

- Gmail draft redirect URI in Google Cloud exactly matches `.env`.
- Outlook draft redirect URI in Microsoft Entra exactly matches `.env`.
- The local app runs at `http://localhost:3000` when using the default redirect URIs.
- If you use a different local port, update both the provider console and `.env`.

## Test User Checklist

- Use test Gmail and Outlook/Microsoft accounts.
- Add the Gmail account as a Google OAuth test user when needed.
- Confirm Microsoft tenant policy allows delegated `Mail.ReadWrite` for the test account.
- Do not use private inboxes, real names, real recipients, or sensitive documents.

## Consent Screen Notes

- Gmail `gmail.compose` and Microsoft `Mail.ReadWrite` are broader than read-only scopes.
- OAuth providers may show warnings for unverified apps.
- Keep the app in test mode unless you complete provider verification.
- Disconnect and reconnect the draft connector after changing scopes or redirect URIs.

## Settings Verification

After starting the app with `npm run dev:safe`, open `/settings`.

- Gmail Draft Creation should show configured credentials and encryption key present.
- Outlook Draft Creation should show configured credentials and encryption key present.
- Connect each draft connector using the test account.
- If a connector was previously connected with wrong scopes, disconnect and reconnect it.

## Disconnect and Reconnect

Use the disconnect action on the Gmail Draft or Outlook Draft card in `/settings`.
Reconnect after changing OAuth credentials, redirect URIs, permissions, or scopes.

## No-Send Reminder

Run `npm run security:no-send` before live testing. During live testing, confirm:

- provider drafts appear in Drafts
- Sent folders remain empty for the test action
- recipients do not receive email
- `emails_sent` remains 0 after `npm run analytics:run`
