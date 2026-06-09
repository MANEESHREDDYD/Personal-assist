import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode, fetchUserProfile } from "@/lib/integrations/outlookMail";
import { encryptToken } from "@/lib/integrations/crypto";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    await logAudit("outlook_mail_connection_failed", "System", "oauth", { details: `OAuth Error: ${error}` });
    return NextResponse.redirect(new URL("/settings?error=" + error, req.url));
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get("outlook_mail_oauth_state")?.value;
  if (!state || state !== storedState) {
    await logAudit("outlook_mail_connection_failed", "System", "oauth", { details: "Invalid state parameter." });
    return NextResponse.redirect(new URL("/settings?error=invalid_state", req.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/settings?error=no_code", req.url));
  }

  try {
    const tokens = await exchangeCode(code);
    
    // Fetch profile to get email
    const profile = await fetchUserProfile(tokens.access_token);
    const email = profile.userPrincipalName || profile.mail;

    if (!email) {
      throw new Error("Could not determine email from Microsoft profile.");
    }

    const encryptedAccess = encryptToken(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;

    // Upsert ConnectorAccount for outlook_mail
    const account = await prisma.connectorAccount.upsert({
      where: { provider_email: { provider: "outlook_mail", email } },
      update: {
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh,
        status: "connected",
        lastError: null,
      },
      create: {
        provider: "outlook_mail",
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh,
        email,
        status: "connected"
      }
    });

    await logAudit("outlook_mail_connected", "ConnectorAccount", account.id, { email });

    return NextResponse.redirect(new URL("/settings", req.url));
  } catch (err: any) {
    console.error("Outlook Mail OAuth error:", err);
    await logAudit("outlook_mail_connection_failed", "System", "oauth", { details: err.message });
    return NextResponse.redirect(new URL("/settings?error=oauth_failed", req.url));
  }
}
