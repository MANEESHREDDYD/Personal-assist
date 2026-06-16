import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/integrations/outlookCalendar";
import { cookies } from "next/headers";
import crypto from "crypto";
import { prisma as db } from "@/lib/prisma";

export async function GET() {
  try {
    const state = crypto.randomBytes(16).toString("hex");
    const url = getAuthUrl(state);

    const cookieStore = await cookies();
    cookieStore.set("outlook_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60, // 10 minutes
      path: "/",
    });

    await db.auditLog.create({
      data: {
        action: "outlook_calendar_connect_started",
        entityType: "connector",
        entityId: "outlook_calendar"
      }
    });

    return NextResponse.redirect(url);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
