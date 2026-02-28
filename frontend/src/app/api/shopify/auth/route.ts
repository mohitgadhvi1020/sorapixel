import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const SCOPES = "read_products,write_products";

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { storeUrl, clientId, clientSecret } = body;

  if (!storeUrl || !clientId || !clientSecret) {
    return NextResponse.json(
      { error: "Store URL, Client ID, and Client Secret are required" },
      { status: 400 }
    );
  }

  let normalizedUrl = storeUrl
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/+$/, "");
  if (!normalizedUrl.includes(".myshopify.com")) {
    normalizedUrl = `${normalizedUrl}.myshopify.com`;
  }

  const nonce = crypto.randomBytes(16).toString("hex");

  const origin = process.env.NEXT_PUBLIC_SITE_URL || req.headers.get("origin") || req.headers.get("referer")?.replace(/\/[^/]*$/, "") || "";
  const redirectUri = `${origin}/api/shopify/callback`;

  const cookieStore = await cookies();
  cookieStore.set("shopify_oauth", JSON.stringify({
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    storeUrl: normalizedUrl,
    nonce,
    redirectUri,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const authUrl =
    `https://${normalizedUrl}/admin/oauth/authorize` +
    `?client_id=${encodeURIComponent(clientId.trim())}` +
    `&scope=${encodeURIComponent(SCOPES)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${nonce}`;

  return NextResponse.json({ authUrl });
}
