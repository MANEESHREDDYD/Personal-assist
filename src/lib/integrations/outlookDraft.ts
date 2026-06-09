/**
 * Outlook Draft connector (Phase 3H).
 *
 * Creates provider-side Outlook drafts ONLY, using the `Mail.ReadWrite` delegated
 * permission. This connector is kept isolated from the read-only `outlook_mail`
 * connector (which uses `Mail.Read`). Personal Assist never sends email: this
 * module only ever POSTs to /me/messages (which creates a draft). It never calls
 * /send, sendMail, or any message update/move/delete endpoint.
 */

const OUTLOOK_DRAFT_SCOPE = "offline_access User.Read Mail.ReadWrite";
const DRAFT_FOOTER =
  "Created as a draft by Personal Assist. Please review before sending.";

function getRedirectUri(): string {
  return (
    process.env.MICROSOFT_OUTLOOK_DRAFT_REDIRECT_URI ||
    "http://localhost:3000/api/integrations/outlook-draft/callback"
  );
}

function getTenant(): string {
  return process.env.MICROSOFT_TENANT || "common";
}

export function getAuthUrl(state: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error("Missing MICROSOFT_CLIENT_ID");

  const url = new URL(
    `https://login.microsoftonline.com/${getTenant()}/oauth2/v2.0/authorize`
  );
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", OUTLOOK_DRAFT_SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export async function exchangeCode(code: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("Missing Microsoft credentials");

  const res = await fetch(
    `https://login.microsoftonline.com/${getTenant()}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: getRedirectUri(),
        grant_type: "authorization_code",
      }).toString(),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to exchange Microsoft code: ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("Missing Microsoft credentials");

  const res = await fetch(
    `https://login.microsoftonline.com/${getTenant()}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }).toString(),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to refresh Microsoft token: ${await res.text()}`);
  }
  return res.json();
}

export async function fetchUserProfile(accessToken: string) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok)
    throw new Error(`Failed to fetch user profile: ${await res.text()}`);
  return res.json();
}

export interface DraftFields {
  to?: string | null;
  cc?: string | null;
  bcc?: string | null;
  subject?: string | null;
  body?: string | null;
}

// Convert a comma/semicolon separated recipient string into Graph recipients.
function toRecipients(value?: string | null) {
  if (!value) return [];
  return value
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((address) => ({ emailAddress: { address } }));
}

/**
 * Creates an Outlook draft via POST /me/messages (a draft is created, not sent).
 * Returns the safe message id + webLink. NEVER calls /send or sendMail.
 */
export async function createOutlookDraft(
  accessToken: string,
  fields: DraftFields
): Promise<{ messageId: string; webLink: string }> {
  const payload = {
    subject: fields.subject || "(No Subject)",
    body: {
      contentType: "Text",
      content: `${fields.body || ""}\n\n--\n${DRAFT_FOOTER}`,
    },
    toRecipients: toRecipients(fields.to),
    ccRecipients: toRecipients(fields.cc),
    ...(fields.bcc ? { bccRecipients: toRecipients(fields.bcc) } : {}),
  };

  const res = await fetch("https://graph.microsoft.com/v1.0/me/messages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Failed to create Outlook draft: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    messageId: data.id,
    webLink: data.webLink || "",
  };
}
