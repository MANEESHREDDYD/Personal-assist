import { NextResponse } from "next/server";
import { exchangeCode, getUserProfile, encryptToken } from "@/lib/integrations/gmail";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      await logAudit("gmail_connection_failed", "ConnectorAccount", "gmail", { error });
      return NextResponse.redirect(new URL("/settings?error=gmail_oauth_denied", request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/settings?error=missing_code", request.url));
    }

    await logAudit("gmail_connect_started", "ConnectorAccount", "gmail");

    const tokenData = await exchangeCode(code);
    const profile = await getUserProfile(tokenData.access_token);

    const email = profile.emailAddress;
    const encryptedAccess = encryptToken(tokenData.access_token);
    const encryptedRefresh = tokenData.refresh_token ? encryptToken(tokenData.refresh_token) : undefined;
    
    const expiry = new Date();
    expiry.setSeconds(expiry.getSeconds() + tokenData.expires_in);

    await prisma.connectorAccount.upsert({
      where: {
        provider_email: {
          provider: "gmail",
          email: email
        }
      },
      update: {
        status: "connected",
        accessTokenEncrypted: encryptedAccess,
        ...(encryptedRefresh && { refreshTokenEncrypted: encryptedRefresh }),
        tokenExpiry: expiry,
        lastError: null
      },
      create: {
        provider: "gmail",
        email: email,
        status: "connected",
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh || "",
        tokenExpiry: expiry
      }
    });

    await logAudit("gmail_connected", "ConnectorAccount", "gmail", { email });

    return NextResponse.redirect(new URL("/settings?success=gmail_connected", request.url));
  } catch (error: any) {
    console.error("Gmail callback error", error);
    await logAudit("gmail_connection_failed", "ConnectorAccount", "gmail", { error: error.message });
    return NextResponse.redirect(new URL("/settings?error=gmail_callback_failed", request.url));
  }
}
