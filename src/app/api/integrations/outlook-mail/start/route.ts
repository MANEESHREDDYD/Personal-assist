import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/integrations/outlookMail";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  const state = crypto.randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("outlook_mail_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10
  });

  try {
    const url = getAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
