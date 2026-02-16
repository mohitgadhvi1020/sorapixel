import { NextResponse } from "next/server";
import { getSessionClient, isSupabaseConfigured } from "@/lib/auth";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ authenticated: false, legacy: true });
  }

  const client = await getSessionClient();
  if (!client) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    user: client,
  });
}
