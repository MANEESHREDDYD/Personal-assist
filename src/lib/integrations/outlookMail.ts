
export function getAuthUrl(state: string): string {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_OUTLOOK_MAIL_REDIRECT_URI || "http://localhost:3000/api/integrations/outlook-mail/callback";
  const tenant = process.env.MICROSOFT_TENANT || "common";
  
  if (!clientId) throw new Error("Missing MICROSOFT_CLIENT_ID");

  const url = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  // Required read-only scopes for Mail
  url.searchParams.set("scope", "offline_access User.Read Mail.Read");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account"); 
  return url.toString();
}

export async function exchangeCode(code: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const redirectUri = process.env.MICROSOFT_OUTLOOK_MAIL_REDIRECT_URI || "http://localhost:3000/api/integrations/outlook-mail/callback";
  const tenant = process.env.MICROSOFT_TENANT || "common";

  if (!clientId || !clientSecret) throw new Error("Missing Microsoft credentials");

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    }).toString()
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to exchange Microsoft code: ${error}`);
  }

  return res.json();
}

export async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
  const tenant = process.env.MICROSOFT_TENANT || "common";
  
  if (!clientId || !clientSecret) throw new Error("Missing Microsoft credentials");

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }).toString()
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to refresh Microsoft token: ${error}`);
  }

  return res.json();
}

export async function fetchUserProfile(accessToken: string) {
  const res = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch user profile: ${await res.text()}`);
  return res.json(); // returns user profile containing 'userPrincipalName' (usually email)
}

export async function fetchInboxMessages(accessToken: string, limit: number = 10) {
  const url = new URL("https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages");
  
  url.searchParams.set("$top", limit.toString());
  url.searchParams.set("$orderby", "receivedDateTime desc");
  url.searchParams.set("$select", "id,conversationId,internetMessageId,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,bodyPreview,hasAttachments,importance,isRead,webLink");
  
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Prefer: 'outlook.body-content-type="text"'
  };

  const res = await fetch(url.toString(), { headers });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch inbox messages: ${await res.text()}`);
  }
  
  const data = await res.json();
  return data.value || []; 
}

export async function fetchMessageDetails(accessToken: string, messageId: string) {
  // Fetch specific message to get full body and attachment metadata if needed
  const url = `https://graph.microsoft.com/v1.0/me/messages/${messageId}?$select=body,uniqueBody,attachments`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch message details: ${await res.text()}`);
  }
  
  return res.json();
}

export interface OutlookRecipient {
  emailAddress?: { name?: string; address?: string };
}

export function extractEmailAddresses(recipientObj: unknown): { name: string, email: string }[] {
  if (!recipientObj || !Array.isArray(recipientObj)) return [];
  return (recipientObj as OutlookRecipient[]).map(r => ({
    name: r.emailAddress?.name || "",
    email: r.emailAddress?.address || ""
  })).filter(r => !!r.email);
}

export interface OutlookAttachment {
  id: string;
  name: string;
  contentType: string;
  size: number;
  isInline: boolean;
}

export function extractAttachmentMetadata(attachments: unknown): { id: string; filename: string; contentType: string; size: number; isInline: boolean; status: string }[] {
  if (!attachments || !Array.isArray(attachments)) return [];
  return (attachments as OutlookAttachment[]).map(a => ({
    id: a.id,
    filename: a.name,
    contentType: a.contentType,
    size: a.size,
    isInline: a.isInline,
    status: "metadata_only"
  }));
}

export function stripHtmlToText(html: string): string {
  if (!html) return "";
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
  text = text.replace(/<style[^>]*>([\S\s]*?)<\/style>/gmi, '');
  // Remove all other HTML tags
  text = text.replace(/<[^>]*>?/gm, '');
  // Decode common entities
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return text.trim();
}

export interface OutlookBody {
  contentType?: string;
  content?: string;
}

export function extractBodyText(bodyObj: OutlookBody | null | undefined): { text: string, source: string } {
  if (!bodyObj) return { text: "", source: "none" };
  
  if (bodyObj.contentType === "text") {
    return { text: bodyObj.content || "", source: "text" };
  } else if (bodyObj.contentType === "html") {
    return { text: stripHtmlToText(bodyObj.content), source: "html" };
  }
  
  return { text: "", source: "unknown" };
}

export interface OutlookMessage {
  id: string;
  conversationId?: string;
  internetMessageId?: string;
  subject?: string;
  from?: OutlookRecipient;
  toRecipients?: OutlookRecipient[];
  ccRecipients?: OutlookRecipient[];
  receivedDateTime: string;
  sentDateTime: string;
  bodyPreview?: string;
  hasAttachments?: boolean;
  importance?: string;
  isRead?: boolean;
  webLink?: string;
}

export async function parseOutlookMessage(message: OutlookMessage, details?: { body?: OutlookBody; attachments?: OutlookAttachment[] }) {
  const sender = message.from?.emailAddress ? {
    name: message.from.emailAddress.name || "",
    email: message.from.emailAddress.address || ""
  } : null;
  
  const toRecipients = extractEmailAddresses(message.toRecipients);
  const ccRecipients = extractEmailAddresses(message.ccRecipients);

  let bodyData = { text: "", source: "preview" };
  let attachmentsMeta: { id: string; filename: string; contentType: string; size: number; isInline: boolean; status: string }[] = [];
  
  if (details) {
    if (details.body) {
      bodyData = extractBodyText(details.body);
    }
    if (details.attachments && Array.isArray(details.attachments)) {
      attachmentsMeta = extractAttachmentMetadata(details.attachments);
    }
  }

  // Fallback to bodyPreview if we couldn't extract body text
  if (!bodyData.text && message.bodyPreview) {
    bodyData.text = message.bodyPreview;
    bodyData.source = "preview";
  }

  return {
    id: message.id,
    conversationId: message.conversationId,
    internetMessageId: message.internetMessageId,
    subject: message.subject || "(No Subject)",
    sender,
    toRecipients,
    ccRecipients,
    receivedDateTime: new Date(message.receivedDateTime),
    sentDateTime: new Date(message.sentDateTime),
    bodyPreview: message.bodyPreview || "",
    bodyText: bodyData.text,
    bodySource: bodyData.source,
    hasAttachments: message.hasAttachments || false,
    attachmentsMeta,
    importance: message.importance,
    isRead: message.isRead,
    webLink: message.webLink
  };
}

export async function fetchOutlookAttachment(accessToken: string, messageId: string, attachmentId: string) {
  const url = `https://graph.microsoft.com/v1.0/me/messages/${messageId}/attachments/${attachmentId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) throw new Error(`Failed to fetch attachment: ${await res.text()}`);
  return res.json();
}
