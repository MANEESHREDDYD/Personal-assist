import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getAuthUrl } from "@/lib/integrations/outlookDraft";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("outlook_draft_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
  });

  try {
    await logAudit("outlook_draft_connect_started", "ConnectorAccount", "outlook_draft");
    const url = getAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error("Failed to start Outlook Draft auth", error);
    await logAudit("outlook_draft_connection_failed", "ConnectorAccount", "outlook_draft", {
      error: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
