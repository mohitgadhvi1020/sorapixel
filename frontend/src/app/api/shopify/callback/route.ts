import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const shop = url.searchParams.get("shop");

  const baseRedirect = url.origin + "/batch-listing";

  if (!code || !shop) {
    return NextResponse.redirect(
      `${baseRedirect}?shopify_error=${encodeURIComponent("Missing authorization code from Shopify")}`
    );
  }

  const cookieStore = await cookies();
  const oauthCookie = cookieStore.get("shopify_oauth");
  if (!oauthCookie?.value) {
    return NextResponse.redirect(
      `${baseRedirect}?shopify_error=${encodeURIComponent("OAuth session expired. Please try connecting again.")}`
    );
  }

  let oauthData: {
    clientId: string;
    clientSecret: string;
    storeUrl: string;
    nonce: string;
  };
  try {
    oauthData = JSON.parse(oauthCookie.value);
  } catch {
    return NextResponse.redirect(
      `${baseRedirect}?shopify_error=${encodeURIComponent("Invalid OAuth session. Please try again.")}`
    );
  }

  if (state !== oauthData.nonce) {
    return NextResponse.redirect(
      `${baseRedirect}?shopify_error=${encodeURIComponent("OAuth state mismatch — possible CSRF. Please try again.")}`
    );
  }

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      `${baseRedirect}?shopify_error=${encodeURIComponent("Not authenticated. Please log in and try again.")}`
    );
  }

  let accessToken: string;
  try {
    const tokenRes = await fetch(
      `https://${oauthData.storeUrl}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: oauthData.clientId,
          client_secret: oauthData.clientSecret,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.redirect(
        `${baseRedirect}?shopify_error=${encodeURIComponent(`Failed to get access token: ${errText.slice(0, 200)}`)}`
      );
    }

    const tokenData = await tokenRes.json();
    accessToken = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(
        `${baseRedirect}?shopify_error=${encodeURIComponent("No access token received from Shopify")}`
      );
    }
  } catch (err) {
    return NextResponse.redirect(
      `${baseRedirect}?shopify_error=${encodeURIComponent(err instanceof Error ? err.message : "Token exchange failed")}`
    );
  }

  try {
    const verifyRes = await fetch(
      `https://${oauthData.storeUrl}/admin/api/2024-04/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
      }
    );
    if (!verifyRes.ok) {
      return NextResponse.redirect(
        `${baseRedirect}?shopify_error=${encodeURIComponent("Access token verification failed")}`
      );
    }
  } catch {
    return NextResponse.redirect(
      `${baseRedirect}?shopify_error=${encodeURIComponent("Could not verify Shopify connection")}`
    );
  }

  const sb = getSupabaseAdmin();
  await sb
    .from("clients")
    .update({
      shopify_store_url: oauthData.storeUrl,
      shopify_access_token: accessToken,
    })
    .eq("id", user.id);

  cookieStore.delete("shopify_oauth");

  return NextResponse.redirect(`${baseRedirect}?shopify_connected=true`);
}
