import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";
import { getAuthUrl } from "@/lib/integrations/gmailDraft";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("gmail_draft_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
  });

  try {
    await logAudit("gmail_draft_connect_started", "ConnectorAccount", "gmail_draft");
    const url = getAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (error: any) {
    console.error("Failed to start Gmail Draft auth", error);
    await logAudit("gmail_draft_connection_failed", "ConnectorAccount", "gmail_draft", {
      error: error.message,
    });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
