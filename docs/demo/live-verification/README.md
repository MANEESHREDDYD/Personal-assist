# Live Provider Verification — Evidence Folder

This folder holds **redacted** artifacts proving that Gmail/Outlook provider draft
creation and attachment upload behave as designed — **without leaking any private data**.

Live verification requires **your own** Gmail/Outlook OAuth credentials and mailboxes,
so it must be run manually. Nothing here asserts that live tests passed unless you have
actually run them and filled in the results template.

## What belongs here

- A sanitized results file you create from
  [`live-provider-results.template.md`](./live-provider-results.template.md) — save it as
  `live-provider-results.md` (sanitized, **no private data**).
- The checklist: [`live-provider-checklist.md`](./live-provider-checklist.md).

## Redaction rules — NEVER commit

- ❌ Screenshots containing private inboxes, real names, real email addresses, subjects,
  recipients, message bodies, or file contents.
- ❌ OAuth client secrets, access tokens, refresh tokens, or `Authorization` headers.
- ❌ Real recipient or sender email addresses (use `a***@example.com` style placeholders).
- ❌ Raw screenshots of any kind committed to git (they are gitignored — keep them local
  only, or redact heavily and store outside the repo).

## What is safe to commit

- ✅ The sanitized markdown results file with **pass / fail / not tested** markers.
- ✅ Placeholder/redacted text only.

## Guardrails

- Raw image/PDF files under this folder are **gitignored** (`*.png`, `*.jpg`, `*.jpeg`,
  `*.webp`, `*.pdf`, and `raw/`).
- `npm run security:demo-evidence` scans this folder for disallowed raw screenshots and
  obvious secrets (tokens, client secrets, non-placeholder emails) before you commit.

> Reminder: Personal Assist never sends email. Live verification confirms that drafts and
> attachments are created in your provider, and that **nothing is sent**.
