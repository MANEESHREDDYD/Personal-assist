export { encryptToken, decryptToken } from "./crypto";
export function getAuthUrl(): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/gmail/callback";
  if (!clientId) throw new Error("Missing GOOGLE_CLIENT_ID");

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/gmail.readonly");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent"); // Ensure we get a refresh token
  return url.toString();
}

export async function exchangeCode(code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/gmail/callback";
  
  if (!clientId || !clientSecret) throw new Error("Missing GOOGLE credentials");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }).toString()
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to exchange code: ${error}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) throw new Error("Missing GOOGLE credentials");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token"
    }).toString()
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return res.json();
}

export async function getUserProfile(accessToken: string) {
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch user profile: ${await res.text()}`);
  return res.json();
}

export async function fetchRecentMessages(accessToken: string, limit: number = 10) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to list messages: ${await res.text()}`);
  
  const data = await res.json();
  if (!data.messages) return [];

  const fullMessages = await Promise.all(
    data.messages.map(async (msg: { id: string }) => {
      const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (msgRes.ok) {
        return msgRes.json();
      }
      return null;
    })
  );

  return fullMessages.filter(m => m !== null);
}

// Minimal base64url decode
function decodeBase64Url(str: string) {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf-8");
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPart {
  filename?: string;
  mimeType?: string;
  body?: {
    attachmentId?: string;
    size?: number;
    data?: string;
  };
  parts?: GmailPart[];
}

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet?: string;
  payload?: {
    headers?: GmailHeader[];
  } & GmailPart;
}

export function parseGmailMessage(message: GmailMessage) {
  const payload = message.payload;
  if (!payload) {
    return {
      id: message.id,
      threadId: message.threadId,
      subject: "No Subject",
      from: "Unknown",
      to: "Unknown",
      date: new Date().toISOString(),
      snippet: message.snippet,
      body: message.snippet || "",
      hasAttachments: false,
      attachmentsMeta: []
    };
  }
  const headers = payload.headers || [];
  
  let subject = "No Subject";
  let from = "Unknown";
  let to = "Unknown";
  let date = new Date().toISOString();

  headers.forEach((h: GmailHeader) => {
    if (h.name.toLowerCase() === "subject") subject = h.value;
    if (h.name.toLowerCase() === "from") from = h.value;
    if (h.name.toLowerCase() === "to") to = h.value;
    if (h.name.toLowerCase() === "date") date = new Date(h.value).toISOString();
  });

  let plainTextBody = "";
  let htmlBody = "";
  const attachmentsMeta: { id: string; filename: string; contentType?: string; size?: number; status: string }[] = [];

  function extractBody(part: GmailPart | undefined) {
    if (!part) return;
    
    if (part.filename && part.body && part.body.attachmentId) {
      attachmentsMeta.push({
        id: part.body.attachmentId,
        filename: part.filename,
        contentType: part.mimeType,
        size: part.body.size,
        status: "metadata_only"
      });
    }

    if (part.mimeType === "text/plain" && part.body && part.body.data) {
      plainTextBody += decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body && part.body.data) {
      htmlBody += decodeBase64Url(part.body.data);
    } else if (part.parts) {
      part.parts.forEach(extractBody);
    }
  }

  extractBody(payload);

  let body = plainTextBody.trim();
  if (!body && htmlBody) {
    body = stripHtml(htmlBody);
  }
  if (!body) {
    body = message.snippet || "";
  }

  return {
    id: message.id,
    threadId: message.threadId,
    subject,
    from,
    to,
    date,
    snippet: message.snippet,
    body,
    hasAttachments: attachmentsMeta.length > 0,
    attachmentsMeta
  };
}

export async function fetchGmailAttachment(accessToken: string, messageId: string, attachmentId: string) {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch attachment: ${await res.text()}`);
  return res.json();
}
