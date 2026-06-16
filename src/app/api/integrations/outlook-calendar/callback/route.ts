import { NextResponse } from "next/server";
import { exchangeCode, fetchUserProfile } from "@/lib/integrations/outlookCalendar";
import { encryptToken } from "@/lib/integrations/crypto";
import { prisma as db } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const state = searchParams.get("state");

    if (error) {
      await db.auditLog.create({
        data: {
          action: "outlook_calendar_connection_failed",
          entityType: "connector",
          entityId: "outlook_calendar",
          details: JSON.stringify({ error })
        }
      });
      return NextResponse.redirect(new URL("/settings?error=" + encodeURIComponent(error), request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/settings?error=NoCode", request.url));
    }

    const cookieStore = await cookies();
    const savedState = cookieStore.get("outlook_oauth_state")?.value;

    if (!savedState || state !== savedState) {
      await db.auditLog.create({
        data: {
          action: "outlook_calendar_connection_failed",
          entityType: "connector",
          entityId: "outlook_calendar",
          details: JSON.stringify({ error: "Invalid state parameter (CSRF)" })
        }
      });
      return NextResponse.redirect(new URL("/settings?error=InvalidState", request.url));
    }

    // Exchange code for tokens
    const tokenData = await exchangeCode(code);
    
    let email = "unknown_outlook_account";
    try {
      const profile = await fetchUserProfile(tokenData.access_token);
      if (profile && profile.userPrincipalName) {
        email = profile.userPrincipalName;
      } else if (profile && profile.mail) {
        email = profile.mail;
      }
    } catch (e) {
      console.error("Failed to fetch outlook profile", e);
    }

    const encryptedAccess = encryptToken(tokenData.access_token);
    let encryptedRefresh = null;
    if (tokenData.refresh_token) {
      encryptedRefresh = encryptToken(tokenData.refresh_token);
    }

    const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);

    await db.connectorAccount.upsert({
      where: {
        provider_email: {
          provider: "outlook_calendar",
          email: email
        }
      },
      update: {
        accessTokenEncrypted: encryptedAccess,
        ...(encryptedRefresh && { refreshTokenEncrypted: encryptedRefresh }),
        tokenExpiry: expiryDate,
        status: "connected",
        lastError: null
      },
      create: {
        provider: "outlook_calendar",
        email: email,
        status: "connected",
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh,
        tokenExpiry: expiryDate,
      }
    });

    await db.auditLog.create({
      data: {
        action: "outlook_calendar_connected",
        entityType: "connector",
        entityId: "outlook_calendar",
        details: JSON.stringify({ email })
      }
    });

    return NextResponse.redirect(new URL("/settings?success=OutlookCalendarConnected", request.url));

  } catch (error: unknown) {
    console.error("Outlook Calendar callback error:", error);
    await db.auditLog.create({
      data: {
        action: "outlook_calendar_connection_failed",
        entityType: "connector",
        entityId: "outlook_calendar",
        details: JSON.stringify({ error: (error as Error).message })
      }
    });
    return NextResponse.redirect(new URL("/settings?error=" + encodeURIComponent((error as Error).message), request.url));
  }
}
