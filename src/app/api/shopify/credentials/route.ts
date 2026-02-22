import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/auth";
import { getClientId } from "@/lib/track-usage";

/**
 * GET /api/shopify/credentials — check if Shopify is connected
 */
export async function GET() {
    const clientId = await getClientId();
    if (!clientId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    if (!isSupabaseConfigured()) {
        return NextResponse.json({ connected: false, storeUrl: "" });
    }

    const sb = getSupabaseServer();
    const { data } = await sb
        .from("clients")
        .select("shopify_store_url, shopify_access_token")
        .eq("id", clientId)
        .single();

    const storeUrl = data?.shopify_store_url || "";
    const hasToken = !!(data?.shopify_access_token);

    return NextResponse.json({
        connected: !!(storeUrl && hasToken),
        storeUrl,
    });
}

/**
 * POST /api/shopify/credentials — save Shopify store URL + access token
 */
export async function POST(req: Request) {
    const clientId = await getClientId();
    if (!clientId) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { storeUrl, accessToken } = body;

    if (!storeUrl || !accessToken) {
        return NextResponse.json(
            { error: "Store URL and access token are required" },
            { status: 400 }
        );
    }

    // Normalize store URL — strip protocol, trailing slash
    let normalizedUrl = storeUrl
        .trim()
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");

    // Ensure it ends with .myshopify.com
    if (!normalizedUrl.includes(".myshopify.com")) {
        normalizedUrl = `${normalizedUrl}.myshopify.com`;
    }

    // Validate by making a test API call to Shopify
    try {
        const testRes = await fetch(
            `https://${normalizedUrl}/admin/api/2024-04/shop.json`,
            {
                headers: {
                    "X-Shopify-Access-Token": accessToken.trim(),
                    "Content-Type": "application/json",
                },
            }
        );

        if (!testRes.ok) {
            const errText = await testRes.text();
            return NextResponse.json(
                {
                    error:
                        testRes.status === 401
                            ? "Invalid access token. Please check your token and try again."
                            : `Shopify API error (${testRes.status}): ${errText.slice(0, 200)}`,
                },
                { status: 400 }
            );
        }
    } catch (err) {
        return NextResponse.json(
            {
                error: `Could not connect to Shopify store "${normalizedUrl}". Please check the store URL.`,
            },
            { status: 400 }
        );
    }

    if (isSupabaseConfigured()) {
        const sb = getSupabaseServer();
        await sb
            .from("clients")
            .update({
                shopify_store_url: normalizedUrl,
                shopify_access_token: accessToken.trim(),
            })
            .eq("id", clientId);
    }

    return NextResponse.json({
        success: true,
        connected: true,
        storeUrl: normalizedUrl,
    });
}
