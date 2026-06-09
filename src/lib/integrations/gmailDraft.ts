/**
 * Gmail Draft connector (Phase 3H).
 *
 * Creates provider-side Gmail drafts ONLY. This connector deliberately uses a
 * separate OAuth client and the `gmail.compose` scope, kept isolated from the
 * read-only `gmail` connector. Personal Assist never sends email: this module
 * only ever calls the Gmail create-draft endpoint (users.drafts.create). It
 * never calls any draft-send, message-send, modify, or label endpoint. The
 * forbidden endpoints are enumerated in docs/security/no-send-policy.md and
 * enforced by scripts/check-no-send-policy.mjs.
 */

const GMAIL_COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";
const DRAFT_FOOTER =
  "Created as a draft by Personal Assist. Please review before sending.";

function getRedirectUri(): string {
  return (
    process.env.GOOGLE_GMAIL_DRAFT_REDIRECT_URI ||
    "http://localhost:3000/api/integrations/gmail-draft/callback"
  );
}

export function getAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_GMAIL_DRAFT_CLIENT_ID;
  if (!clientId) throw new Error("Missing GOOGLE_GMAIL_DRAFT_CLIENT_ID");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GMAIL_COMPOSE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent"); // ensure a refresh token is returned
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCode(code: string) {
  const clientId = process.env.GOOGLE_GMAIL_DRAFT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GMAIL_DRAFT_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("Missing GOOGLE_GMAIL_DRAFT credentials");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      grant_type: "authorization_code",
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Failed to exchange code: ${await res.text()}`);
  }
  return res.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_GMAIL_DRAFT_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_GMAIL_DRAFT_CLIENT_SECRET;
  if (!clientId || !clientSecret)
    throw new Error("Missing GOOGLE_GMAIL_DRAFT credentials");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!res.ok) {
    throw new Error(`Failed to refresh token: ${await res.text()}`);
  }
  return res.json();
}

export async function fetchUserProfile(accessToken: string) {
  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/profile",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok)
    throw new Error(`Failed to fetch user profile: ${await res.text()}`);
  return res.json();
}

export function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export interface DraftFields {
  to?: string | null;
  cc?: string | null;
  bcc?: string | null;
  subject?: string | null;
  body?: string | null;
}

/**
 * Builds a minimal RFC 2822 text/plain message. Recipients are passed through
 * as-is from the local draft; no addresses are injected. A clear footer marks
 * the message as a Personal Assist draft requiring manual review.
 */
export function buildRfc2822Message(fields: DraftFields): string {
  const headers: string[] = [];
  if (fields.to) headers.push(`To: ${sanitizeHeader(fields.to)}`);
  if (fields.cc) headers.push(`Cc: ${sanitizeHeader(fields.cc)}`);
  if (fields.bcc) headers.push(`Bcc: ${sanitizeHeader(fields.bcc)}`);
  headers.push(`Subject: ${sanitizeHeader(fields.subject || "(No Subject)")}`);
  headers.push("MIME-Version: 1.0");
  headers.push('Content-Type: text/plain; charset="UTF-8"');
  headers.push("Content-Transfer-Encoding: 7bit");

  const body = `${fields.body || ""}\n\n--\n${DRAFT_FOOTER}`;

  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

// Strip CR/LF so draft field values cannot inject extra headers.
function sanitizeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/**
 * Creates a Gmail draft via users.drafts.create. Returns the safe draft + message
 * identifiers. NEVER triggers a send (no draft-send or message-send endpoint).
 */
export async function createGmailDraft(
  accessToken: string,
  fields: DraftFields
): Promise<{ draftId: string; messageId: string }> {
  const raw = base64UrlEncode(buildRfc2822Message(fields));

  const res = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/drafts",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: { raw } }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to create Gmail draft: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    draftId: data.id,
    messageId: data.message?.id || "",
  };
}

export interface MimeAttachment {
  filename: string;
  contentType: string;
  content: Buffer;
}

// Wrap a base64 string at 76 chars per line (RFC 2045).
function wrapBase64(b64: string): string {
  return b64.replace(/(.{76})/g, "$1\r\n");
}

/**
 * Encodes a single file as a base64 MIME part (Content-Disposition: attachment).
 * Returns the part WITHOUT the leading boundary delimiter.
 */
export function encodeMimeAttachment(att: MimeAttachment): string {
  const name = sanitizeHeader(att.filename || "attachment");
  const contentType = sanitizeHeader(att.contentType || "application/octet-stream");
  const b64 = wrapBase64(att.content.toString("base64"));
  return [
    `Content-Type: ${contentType}; name="${name}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${name}"`,
    "",
    b64,
  ].join("\r\n");
}

/**
 * Builds a multipart/mixed RFC 2822 message: a text/plain part (body + footer)
 * followed by one base64 attachment part per file. Used to update a Gmail draft
 * so it carries attachments. No send action is performed.
 */
export function buildMultipartRfc2822Message(
  fields: DraftFields,
  attachments: MimeAttachment[]
): string {
  const boundary = `PA_BOUNDARY_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const headers: string[] = [];
  if (fields.to) headers.push(`To: ${sanitizeHeader(fields.to)}`);
  if (fields.cc) headers.push(`Cc: ${sanitizeHeader(fields.cc)}`);
  if (fields.bcc) headers.push(`Bcc: ${sanitizeHeader(fields.bcc)}`);
  headers.push(`Subject: ${sanitizeHeader(fields.subject || "(No Subject)")}`);
  headers.push("MIME-Version: 1.0");
  headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);

  const textPart = [
    `Content-Type: text/plain; charset="UTF-8"`,
    "Content-Transfer-Encoding: 7bit",
    "",
    `${fields.body || ""}\n\n--\n${DRAFT_FOOTER}`,
  ].join("\r\n");

  const parts = [textPart, ...attachments.map(encodeMimeAttachment)];
  const body = parts.map((p) => `--${boundary}\r\n${p}`).join("\r\n") + `\r\n--${boundary}--`;

  return `${headers.join("\r\n")}\r\n\r\n${body}`;
}

/**
 * Updates (replaces) an existing Gmail draft with a multipart message carrying
 * attachments, via users.drafts.update (PUT). Gmail draft update replaces the
 * draft message, so the caller must pass the full intended content + attachment
 * set. NEVER triggers a send (no draft-send or message-send endpoint).
 */
export async function updateGmailDraftWithAttachments(
  accessToken: string,
  draftId: string,
  fields: DraftFields,
  attachments: MimeAttachment[]
): Promise<{ draftId: string; messageId: string }> {
  const raw = base64UrlEncode(buildMultipartRfc2822Message(fields, attachments));

  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${encodeURIComponent(draftId)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: draftId, message: { raw } }),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to update Gmail draft with attachments: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    draftId: data.id,
    messageId: data.message?.id || "",
  };
}
