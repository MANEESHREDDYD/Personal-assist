import { NextResponse } from "next/server";
import { exchangeCode, getUserProfile } from "@/lib/integrations/googleCalendar";
import { encryptToken } from "@/lib/integrations/crypto";
import { prisma as db } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(new URL("/settings?error=" + encodeURIComponent(error), request.url));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/settings?error=NoCode", request.url));
    }

    // Exchange code for tokens
    const tokenData = await exchangeCode(code);
    
    // Get primary calendar to serve as "email/identity"
    let email = "unknown_calendar";
    try {
      const profile = await getUserProfile(tokenData.access_token);
      if (profile && profile.id) {
        email = profile.id;
      }
    } catch (e) {
      console.error("Failed to fetch calendar profile", e);
      // We can continue even without email
    }

    const encryptedAccess = encryptToken(tokenData.access_token);
    let encryptedRefresh = null;
    if (tokenData.refresh_token) {
      encryptedRefresh = encryptToken(tokenData.refresh_token);
    }

    const expiryDate = new Date(Date.now() + tokenData.expires_in * 1000);

    // Upsert the connector account
    await db.connectorAccount.upsert({
      where: {
        provider_email: {
          provider: "google_calendar",
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
        provider: "google_calendar",
        email: email,
        status: "connected",
        accessTokenEncrypted: encryptedAccess,
        refreshTokenEncrypted: encryptedRefresh,
        tokenExpiry: expiryDate,
      }
    });

    await db.auditLog.create({
      data: {
        action: "google_calendar_connected",
        entityType: "connector",
        entityId: "google_calendar",
        details: JSON.stringify({ email })
      }
    });

    return NextResponse.redirect(new URL("/settings?success=CalendarConnected", request.url));

  } catch (error: unknown) {
    console.error("Calendar callback error:", error);
    await db.auditLog.create({
      data: {
        action: "google_calendar_connection_failed",
        entityType: "connector",
        entityId: "google_calendar",
        details: JSON.stringify({ error: (error as Error).message })
      }
    });
    return NextResponse.redirect(new URL("/settings?error=" + encodeURIComponent((error as Error).message), request.url));
  }
}
