/**
 * Shared token handling for the draft connectors (gmail_draft, outlook_draft).
 *
 * Returns a valid access token, refreshing it when it is within 60s of expiry.
 * Tokens are stored AES-256 encrypted server-side and are never logged or
 * returned to the browser.
 */

import { prisma } from "@/lib/prisma";
import { encryptToken, decryptToken } from "@/lib/integrations/crypto";
import * as gmailDraft from "@/lib/integrations/gmailDraft";
import * as outlookDraft from "@/lib/integrations/outlookDraft";

export type DraftProvider = "gmail_draft" | "outlook_draft";

export async function getValidAccessToken(account: any, provider: DraftProvider): Promise<string> {
  const accessToken = account.accessTokenEncrypted
    ? decryptToken(account.accessTokenEncrypted)
    : "";

  const expiry = account.tokenExpiry ? new Date(account.tokenExpiry).getTime() : 0;
  const needsRefresh = !accessToken || expiry < Date.now() + 60_000;

  if (!needsRefresh) return accessToken;

  if (!account.refreshTokenEncrypted) {
    throw new Error("Token expired and no refresh token is available. Reconnect the connector.");
  }

  const refreshToken = decryptToken(account.refreshTokenEncrypted);
  const lib = provider === "gmail_draft" ? gmailDraft : outlookDraft;
  const refreshed = await lib.refreshAccessToken(refreshToken);

  const newExpiry = new Date();
  if (refreshed.expires_in) {
    newExpiry.setSeconds(newExpiry.getSeconds() + refreshed.expires_in);
  }

  await prisma.connectorAccount.update({
    where: { id: account.id },
    data: {
      accessTokenEncrypted: encryptToken(refreshed.access_token),
      ...(refreshed.refresh_token && {
        refreshTokenEncrypted: encryptToken(refreshed.refresh_token),
      }),
      tokenExpiry: newExpiry,
      status: "connected",
      lastError: null,
    },
  });

  return refreshed.access_token;
}
