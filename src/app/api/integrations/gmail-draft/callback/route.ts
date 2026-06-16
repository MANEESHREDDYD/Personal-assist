import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, fetchUserProfile } from "@/lib/integrations/gmailDraft";
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
    await logAudit("gmail_draft_connection_failed", "ConnectorAccount", "gmail_draft", {
      error,
    });
    return NextResponse.redirect(
      new URL("/settings?error=gmail_draft_oauth_denied", request.url)
    );
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("gmail_draft_oauth_state")?.value;
  if (!state || state !== storedState) {
    await logAudit("gmail_draft_connection_failed", "ConnectorAccount", "gmail_draft", {
      error: "Invalid state parameter.",
    });
    return NextResponse.redirect(
      new URL("/settings?error=gmail_draft_invalid_state", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/settings?error=gmail_draft_missing_code", request.url)
    );
  }

  try {
    const tokenData = await exchangeCode(code);
    const profile = await fetchUserProfile(tokenData.access_token);
    const email = profile.emailAddress;

    if (!email) {
      throw new Error("Could not determine email from Gmail profile.");
    }

    const encryptedAccess = encryptToken(tokenData.access_token);
    const encryptedRefresh = tokenData.refresh_token
      ? encryptToken(tokenData.refresh_token)
      : undefined;

    const expiry = new Date();
    if (tokenData.expires_in) {
      expiry.setSeconds(expiry.getSeconds() + tokenData.expires_in);
    }

    await prisma.connectorAccount.upsert({
      where: { provider_email: { provider: "gmail_draft", email } },
      update: {
        status: "connected",
        accessTokenEncrypted: encryptedAccess,
        ...(encryptedRefresh && { refreshTokenEncrypted: encryptedRefresh }),
        tokenExpiry: expiry,
        lastError: null,
      },
      create: {
        provider: "gmail_draft",
        email,
        status: "connected",
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh || "",
        tokenExpiry: expiry,
      },
    });

    await logAudit("gmail_draft_connected", "ConnectorAccount", "gmail_draft", { email });
    return NextResponse.redirect(
      new URL("/settings?success=gmail_draft_connected", request.url)
    );
  } catch (err: unknown) {
    console.error("Gmail Draft callback error", err);
    await logAudit("gmail_draft_connection_failed", "ConnectorAccount", "gmail_draft", {
      error: (err as Error).message,
    });
    return NextResponse.redirect(
      new URL("/settings?error=gmail_draft_callback_failed", request.url)
    );
  }
}
