import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/integrations/gmail";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const url = getAuthUrl();
    return NextResponse.redirect(url);
  } catch (error: unknown) {
    console.error("Failed to start Gmail auth", error);
    return new NextResponse((error as Error).message, { status: 400 });
  }
}
