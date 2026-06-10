/**
 * Outlook Draft connector (Phase 3H).
 *
 * Creates provider-side Outlook drafts ONLY, using the `Mail.ReadWrite` delegated
 * permission. This connector is kept isolated from the read-only `outlook_mail`
 * connector (which uses `Mail.Read`). Personal Assist never sends email: this
 * module only ever POSTs to /me/messages (which creates a draft). It never calls
 * the Graph message-send or send-mail actions, nor any message update/move/delete
 * endpoint. The forbidden endpoints are enumerated in
 * docs/security/no-send-policy.md and enforced by scripts/check-no-send-policy.mjs.
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
 * Returns the safe message id + webLink. NEVER triggers a send (no message-send
 * or send-mail action).
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

/**
 * Attaches a single small file (<= 3 MB) to an existing Outlook draft message via
 * the message attachments collection (Microsoft Graph fileAttachment). Phase 3I
 * uses simple attachments only — large files require upload sessions (Phase 3J).
 * This targets a draft message and NEVER triggers a send.
 */
export async function attachFileToOutlookDraft(
  accessToken: string,
  messageId: string,
  file: { name: string; contentType: string; contentBytes: string }
): Promise<{ attachmentId: string }> {
  const payload = {
    "@odata.type": "#microsoft.graph.fileAttachment",
    name: file.name,
    contentType: file.contentType || "application/octet-stream",
    contentBytes: file.contentBytes,
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}/attachments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to attach file to Outlook draft: ${await res.text()}`);
  }

  const data = await res.json();
  return { attachmentId: data.id || "" };
}

// Microsoft Graph requires upload-session chunks to be a multiple of 320 KiB
// (except the final chunk). 10 * 320 KiB = 3.125 MiB per chunk.
const GRAPH_CHUNK_SIZE = 10 * 327680;

/**
 * Creates a Microsoft Graph upload session for a large attachment on an existing
 * draft message (Phase 3J). Used for files > 3 MB and <= 150 MB. Targets a draft
 * message attachment only and NEVER triggers a send.
 */
export async function createOutlookAttachmentUploadSession(
  accessToken: string,
  messageId: string,
  file: { name: string; size: number; contentType: string }
): Promise<{ uploadUrl: string; expirationDateTime?: string }> {
  const payload = {
    AttachmentItem: {
      attachmentType: "file",
      name: file.name,
      size: file.size,
      contentType: file.contentType || "application/octet-stream",
    },
  };

  const res = await fetch(
    `https://graph.microsoft.com/v1.0/me/messages/${encodeURIComponent(messageId)}/attachments/createUploadSession`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to create Outlook upload session: ${await res.text()}`);
  }

  const data = await res.json();
  if (!data.uploadUrl) throw new Error("Upload session did not return an uploadUrl.");
  return { uploadUrl: data.uploadUrl, expirationDateTime: data.expirationDateTime };
}

/**
 * Uploads file bytes to a Graph upload session URL in sequential chunks.
 * Intermediate chunks return 202; the final chunk returns 200/201 with the
 * created attachment. Returns the attachment id (when available) and chunk count.
 * The upload URL is a short-lived, pre-authorized Graph URL — no auth header is
 * sent and no send endpoint is contacted.
 */
export async function uploadOutlookAttachmentBytes(
  uploadUrl: string,
  content: Buffer,
  opts?: { chunkSize?: number }
): Promise<{ attachmentId?: string; chunks: number }> {
  const chunkSize = opts?.chunkSize ?? GRAPH_CHUNK_SIZE;
  const total = content.length;
  let start = 0;
  let chunks = 0;
  let attachmentId: string | undefined;

  while (start < total) {
    const end = Math.min(start + chunkSize, total);
    const chunk = content.subarray(start, end);

    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(chunk.length),
        "Content-Range": `bytes ${start}-${end - 1}/${total}`,
      },
      // Convert the Buffer slice to a Uint8Array for a standard fetch BodyInit.
      body: new Uint8Array(chunk),
    });
    chunks++;

    if (res.status === 200 || res.status === 201) {
      try {
        const body = await res.json();
        attachmentId = body?.id;
      } catch {
        // Some responses are empty; fall back to the Location header.
      }
      if (!attachmentId) {
        const loc = res.headers.get("location") || "";
        const m = loc.match(/attachments\/([^/?]+)/);
        if (m) attachmentId = decodeURIComponent(m[1]);
      }
      return { attachmentId, chunks };
    }

    if (res.status === 202) {
      start = end;
      continue;
    }

    throw new Error(`Outlook chunk upload failed (${res.status}): ${await res.text()}`);
  }

  return { attachmentId, chunks };
}

/**
 * Attaches a large file (> 3 MB, <= 150 MB) to an existing Outlook draft message
 * using an upload session. NEVER triggers a send.
 */
export async function attachLargeFileToOutlookDraft(
  accessToken: string,
  messageId: string,
  file: { name: string; contentType: string; content: Buffer }
): Promise<{ attachmentId?: string; chunks: number }> {
  const session = await createOutlookAttachmentUploadSession(accessToken, messageId, {
    name: file.name,
    size: file.content.length,
    contentType: file.contentType || "application/octet-stream",
  });
  return uploadOutlookAttachmentBytes(session.uploadUrl, file.content);
}
