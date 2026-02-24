import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * POST /api/admin/request-indexing
 *
 * Submits one or more URLs to the Google Indexing API.
 * Requires: GOOGLE_INDEXING_SA_KEY env var (JSON string of service account key).
 * Only accessible by admin users.
 *
 * Body: { urls: string[], type?: "URL_UPDATED" | "URL_DELETED" }
 */

const SCOPES = ["https://www.googleapis.com/auth/indexing"];

async function getAccessToken(saKey: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = btoa(
    JSON.stringify({
      iss: saKey.client_email,
      scope: SCOPES.join(" "),
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
  );

  const { subtle } = globalThis.crypto;
  const pemBody = saKey.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const key = await subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const input = new TextEncoder().encode(`${header}.${payload}`);
  const sig = await subtle.sign("RSASSA-PKCS1-v1_5", key, input);
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${header}.${payload}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}

async function isAdmin(userId: string): Promise<boolean> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("clients")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "admin";
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const admin = await isAdmin(user.id);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const saKeyStr = process.env.GOOGLE_INDEXING_SA_KEY;
    if (!saKeyStr) {
      return NextResponse.json(
        {
          error: "Google Indexing API not configured. Set GOOGLE_INDEXING_SA_KEY env var with the service account JSON.",
          setup_guide: [
            "1. Go to Google Cloud Console > APIs & Services > Enable 'Web Search Indexing API'",
            "2. Create a Service Account and download the JSON key",
            "3. In Google Search Console, add the service account email as Owner",
            "4. Set GOOGLE_INDEXING_SA_KEY=<JSON contents> in your environment variables",
          ],
        },
        { status: 501 }
      );
    }

    const saKey = JSON.parse(saKeyStr);
    const body = await req.json();
    const urls: string[] = body.urls;
    const type: string = body.type || "URL_UPDATED";

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "Provide an array of urls" }, { status: 400 });
    }

    if (urls.length > 100) {
      return NextResponse.json({ error: "Max 100 URLs per request" }, { status: 400 });
    }

    const accessToken = await getAccessToken(saKey);

    const results = await Promise.allSettled(
      urls.map(async (url) => {
        const res = await fetch(
          "https://indexing.googleapis.com/v3/urlNotifications:publish",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ url, type }),
          }
        );
        const data = await res.json();
        return { url, status: res.status, data };
      })
    );

    const submitted = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { url: urls[i], status: 0, error: String(r.reason) };
    });

    return NextResponse.json({
      success: true,
      submitted,
      summary: {
        total: urls.length,
        ok: submitted.filter((s) => s.status === 200).length,
        failed: submitted.filter((s) => s.status !== 200).length,
      },
    });
  } catch (error) {
    console.error("Indexing API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
