import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, fetchUserProfile } from "@/lib/integrations/outlookDraft";
import { encryptToken } from "@/lib/integrations/crypto";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Never crash on OAuth denial.
  if (error) {
    await logAudit("outlook_draft_connection_failed", "ConnectorAccount", "outlook_draft", {
      error,
    });
    return NextResponse.redirect(
      new URL("/settings?error=outlook_draft_oauth_denied", request.url)
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("outlook_draft_oauth_state")?.value;
  if (!state || state !== storedState) {
    await logAudit("outlook_draft_connection_failed", "ConnectorAccount", "outlook_draft", {
      error: "Invalid state parameter.",
    });
    return NextResponse.redirect(
      new URL("/settings?error=outlook_draft_invalid_state", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?error=outlook_draft_missing_code", request.url)
    );
  }

  try {
    const tokens = await exchangeCode(code);
    const profile = await fetchUserProfile(tokens.access_token);
    const email = profile.userPrincipalName || profile.mail;

    if (!email) {
      throw new Error("Could not determine email from Microsoft profile.");
    }

    const encryptedAccess = encryptToken(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : undefined;

    const expiry = new Date();
    if (tokens.expires_in) {
      expiry.setSeconds(expiry.getSeconds() + tokens.expires_in);
    }

    await prisma.connectorAccount.upsert({
      where: { provider_email: { provider: "outlook_draft", email } },
      update: {
        status: "connected",
        accessTokenEncrypted: encryptedAccess,
        ...(encryptedRefresh && { refreshTokenEncrypted: encryptedRefresh }),
        tokenExpiry: expiry,
        lastError: null,
      },
      create: {
        provider: "outlook_draft",
        email,
        status: "connected",
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh || "",
        tokenExpiry: expiry,
      },
    });

    await logAudit("outlook_draft_connected", "ConnectorAccount", "outlook_draft", { email });
    return NextResponse.redirect(
      new URL("/settings?success=outlook_draft_connected", request.url)
    );
  } catch (err: unknown) {
    console.error("Outlook Draft callback error", err);
    await logAudit("outlook_draft_connection_failed", "ConnectorAccount", "outlook_draft", {
      error: (err as Error).message,
    });
    return NextResponse.redirect(
      new URL("/settings?error=outlook_draft_callback_failed", request.url)
    );
  }
}
