import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/integrations/googleCalendar";

export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
