# Personal Assist MVP

Personal Assist is a human-like AI personal operations assistant that organizes email, documents, signing, scheduling, payments, travel, tickets, orders, reminders, messages, manual entries, and stock market summaries into one command center.

This is the **Phase 1.5 Stabilization** release. It is a local-first, SQLite-backed Next.js application that does not rely on external cloud databases or paid APIs. All data is mock-generated or added manually for demonstration purposes.

## Getting Started

### 1. Installation

```bash
npm install
```

### 2. Database Setup & Seed

Initialize the local SQLite database and insert mock demo data:

```bash
npm run db:reset
```

*This runs Prisma push and seeds the database with realistic demo data.*

### 3. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000` to interact with Personal Assist.

## Phase 2: Local MVP (Completed)
We have successfully implemented a complete Local Intelligence layer:
- **Rule-based & Local LLM parsing** (Ollama integration for `.eml` and text parsing)
- **Local SQLite Action Workspace** (Calendar `.ics` import, contacts, email drafts, task follow-ups)
- **Document workflows** (Mock redlining, native mock signing loops, signature extraction)
- **Local Automation Engine** (Background worker, conditional trigger rules, proactive Daily Briefs)
- **Hardened Local Experience** (First-time onboarding, global search Cmd+K, guided demo, export capabilities, settings health dashboard, smoke tests)

To run the full stack (Next.js server + Background Worker):
```bash
npm run dev:all
```

To run a system smoke test:
```bash
npm run smoke:test
```

## Phase 3A: Gmail Local Beta
Personal Assist now supports a read-only local integration with Gmail. It allows you to manually sync your last 10 or 25 emails, applying the local AI pipeline to organize them automatically without sending data to a cloud backend.

### Setup Instructions
You must create OAuth credentials in the Google Cloud Console.

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project.
3. Enable the **Gmail API**.
4. Configure the OAuth Consent Screen (Internal or External, add yourself as a test user).
5. Create OAuth Credentials (Web Application).
6. Add `http://localhost:3000/api/integrations/gmail/callback` to the **Authorized redirect URIs**.
7. Generate a secure 32-byte encryption key for local token storage:
   ```bash
   openssl rand -base64 32
   ```

### Environment Variables
Add the following to your `.env` file:
```env
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/integrations/gmail/callback"
ENCRYPTION_KEY="your-32-byte-base64-key"
```

### Limitations & Security
- **Local Beta:** This feature is for local testing only. It is not ready for production deployment.
- **Read-Only:** The app only requests `https://www.googleapis.com/auth/gmail.readonly` scope. It cannot send, modify, delete, or mark emails as read.
- **Storage:** OAuth tokens are encrypted using AES-256 and stored locally in your SQLite database. Do NOT expose your `ENCRYPTION_KEY`.

## Phase 3B: Google Calendar Local Beta
Personal Assist now supports a read-only local integration with Google Calendar. You can manually sync your upcoming events (7, 30, or 90 days), extracting events, attendees, and meeting links into the local Wallet.

### Setup Instructions
You must create OAuth credentials in the Google Cloud Console (you can reuse the project from Gmail).

1. Enable the **Google Calendar API**.
2. Configure the OAuth Consent Screen (Internal or External, add yourself as a test user).
3. Create OAuth Credentials (Web Application).
4. Add `http://localhost:3000/api/integrations/google-calendar/callback` to the **Authorized redirect URIs**.

### Environment Variables
Add the following to your `.env` file:
```env
GOOGLE_CALENDAR_CLIENT_ID="your-client-id"
GOOGLE_CALENDAR_CLIENT_SECRET="your-client-secret"
GOOGLE_CALENDAR_REDIRECT_URI="http://localhost:3000/api/integrations/google-calendar/callback"
```

### Limitations & Security
- **Local Beta:** This feature is for local testing only.
- **Read-Only:** The app only requests `https://www.googleapis.com/auth/calendar.events.readonly`. It cannot create, edit, or delete events, or send invites.
- **Storage:** OAuth tokens are encrypted using `ENCRYPTION_KEY` and stored locally in your SQLite database.

## Phase 3C: Outlook Calendar Local Beta
Personal Assist supports a read-only local integration with Outlook Calendar using the Microsoft Graph API.

### Setup Instructions
You must create an App Registration in Microsoft Entra ID (formerly Azure AD).

1. Go to the [Microsoft Entra Admin Center](https://entra.microsoft.com/).
2. Create a new App Registration.
3. Under Supported account types, choose **Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)**.
4. Add a Web platform redirect URI: `http://localhost:3000/api/integrations/outlook-calendar/callback`.
5. Under **API permissions**, add the following delegated permissions for Microsoft Graph: `User.Read`, `Calendars.Read`, `offline_access`.
6. Create a client secret.

### Environment Variables
Add the following to your `.env` file:
```env
MICROSOFT_CLIENT_ID="your-client-id"
MICROSOFT_CLIENT_SECRET="your-client-secret"
MICROSOFT_TENANT="common"
MICROSOFT_REDIRECT_URI="http://localhost:3000/api/integrations/outlook-calendar/callback" # Legacy calendar fallback
MICROSOFT_OUTLOOK_CALENDAR_REDIRECT_URI="http://localhost:3000/api/integrations/outlook-calendar/callback"
```

### Limitations & Security
- **Local Beta:** This feature is for local testing only.
- **Read-Only:** The app only requests `Calendars.Read`. It cannot create, edit, or delete events, or send invites.
- **Storage:** OAuth tokens are encrypted using `ENCRYPTION_KEY` and stored locally in your SQLite database.

## Phase 3D: Outlook Mail Local Beta
Personal Assist supports a read-only local integration with Outlook Mail using the Microsoft Graph API.

### Setup Instructions
Using the same App Registration from Phase 3C:

1. Add an additional Web platform redirect URI: `http://localhost:3000/api/integrations/outlook-mail/callback`.
2. Under **API permissions**, add the `Mail.Read` delegated permission.
3. Update your `.env` to include the distinct redirect URI for mail.

### Environment Variables
Add the following to your `.env` file (alongside your calendar URI):
```env
MICROSOFT_OUTLOOK_MAIL_REDIRECT_URI="http://localhost:3000/api/integrations/outlook-mail/callback"
```

### Limitations & Security
- **Local Beta:** This feature is for local testing only.
- **Read-Only:** The app requests `Mail.Read`. It cannot send emails, delete emails, move folders, mark as read, or modify drafts.
- **Storage:** OAuth tokens are encrypted using `ENCRYPTION_KEY` and stored locally in your SQLite database.

## Phase 3E: Attachment Download on Demand
Personal Assist allows you to explicitly download attachments from your imported Gmail and Outlook emails into the local document vault.

### How it works
- **Explicit Action Required:** Attachments are never downloaded automatically. You must explicitly click "Download" on an attachment.
- **Local Storage:** Decoded attachments are saved to the local `uploads` directory. Cloud storage is not used.
- **Size Limit:** A hardcoded maximum size of 25 MB is enforced.
- **Blocked Extensions:** Unsafe executable and script files (`.exe`, `.sh`, `.js`, etc.) are blocked.
- **Document Creation:** Once downloaded, attachments are converted into local `Document` records and will automatically undergo text extraction if supported (`txt`, `md`, `pdf`, `docx`).

### Limitations & Security
- **No Malware Scanning:** Personal Assist does not perform antivirus scanning on downloaded files.
- **No Bulk Download:** Attachments must be downloaded individually for safety.

## Future Integrations Planned
- **Apple Mail:** Planned as a local macOS helper/native workflow later. Not active yet.
- **Local System Calendar:** Currently supported through `.ics` import. Direct Apple/Windows system calendar access requires a future native helper.

## Features Included in MVP

- **Unified Inbox:** Review extracted emails with mock confidence scores and correct AI mistakes.
- **Life Wallet:** Unified view of tasks, payments, travel, tickets, orders, and stock tickers.
- **Document Management:** Upload mock files and run demo "extract actions" algorithms.
- **Approval Center:** Review and approve AI actions (e.g. wire transfers, email drafting).
- **Audit Log:** Searchable and filterable history of all system actions.
- **Local Data Export:** Export the entire local database to a JSON backup file.
- **Manual Add:** Quickly insert new items into the Life Wallet.

## Architecture & Technology Stack

- **Frontend:** Next.js 14 App Router, React Server Components
- **Styling:** Tailwind CSS, Framer Motion (Glassmorphism design)
- **Database:** Prisma with SQLite (`prisma/dev.db`)
- **API:** Next.js Server Actions and Route Handlers

## Disclaimer

This is a local-only MVP for demonstration purposes. No real external APIs (DocuSign, Plaid, Gmail, Slack) are integrated yet.
