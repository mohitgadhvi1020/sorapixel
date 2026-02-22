import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("clients")
    .select("shopify_store_url, shopify_access_token")
    .eq("id", user.id)
    .single();

  const storeUrl = data?.shopify_store_url || "";
  const hasToken = !!(data?.shopify_access_token);
  return NextResponse.json({ connected: !!(storeUrl && hasToken), storeUrl });
}

export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json();
  const { storeUrl, accessToken } = body;
  if (!storeUrl || !accessToken) {
    return NextResponse.json({ error: "Store URL and access token are required" }, { status: 400 });
  }

  let normalizedUrl = storeUrl.trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (!normalizedUrl.includes(".myshopify.com")) {
    normalizedUrl = `${normalizedUrl}.myshopify.com`;
  }

  try {
    const testRes = await fetch(`https://${normalizedUrl}/admin/api/2024-04/shop.json`, {
      headers: { "X-Shopify-Access-Token": accessToken.trim(), "Content-Type": "application/json" },
    });
    if (!testRes.ok) {
      const errText = await testRes.text();
      return NextResponse.json({
        error: testRes.status === 401
          ? "Invalid access token. Please check your token and try again."
          : `Shopify API error (${testRes.status}): ${errText.slice(0, 200)}`,
      }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: `Could not connect to Shopify store "${normalizedUrl}".` }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  await sb.from("clients").update({
    shopify_store_url: normalizedUrl,
    shopify_access_token: accessToken.trim(),
  }).eq("id", user.id);

  return NextResponse.json({ success: true, connected: true, storeUrl: normalizedUrl });
}
