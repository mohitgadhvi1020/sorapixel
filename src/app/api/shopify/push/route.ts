import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/auth";
import { getClientId } from "@/lib/track-usage";

/**
 * POST /api/shopify/push — push a listing to the client's Shopify store
 *
 * Body: {
 *   title, description, metaDescription, altText,
 *   attributes: { collection, occasion, material, stone, closure, ... },
 *   imageUrl?: string (public URL or base64)
 * }
 */
export async function POST(req: Request) {
    try {
        const clientId = await getClientId();
        if (!clientId) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        // Get Shopify credentials
        let storeUrl = "";
        let accessToken = "";

        if (isSupabaseConfigured()) {
            const sb = getSupabaseServer();
            const { data } = await sb
                .from("clients")
                .select("shopify_store_url, shopify_access_token")
                .eq("id", clientId)
                .single();

            storeUrl = data?.shopify_store_url || "";
            accessToken = data?.shopify_access_token || "";
        }

        if (!storeUrl || !accessToken) {
            return NextResponse.json(
                { error: "Shopify is not connected. Please add your store credentials first." },
                { status: 400 }
            );
        }

        const body = await req.json();
        const { title, description, metaDescription, altText, attributes, imageUrl } = body;

        if (!title) {
            return NextResponse.json(
                { error: "Product title is required" },
                { status: 400 }
            );
        }

        // Build tags from attributes
        const tags: string[] = [];
        if (attributes?.collection) tags.push(attributes.collection);
        if (attributes?.occasion) {
            attributes.occasion.split(",").forEach((o: string) => {
                const trimmed = o.trim();
                if (trimmed) tags.push(trimmed);
            });
        }

        // Build product payload for Shopify Admin API
        const product: Record<string, unknown> = {
            title,
            body_html: description || "",
            vendor: "Stylika",
            product_type: "Fashion Jewelry",
            tags: tags.join(", "),
            status: "draft", // Create as draft so user can review in Shopify
        };

        // Add SEO metafields
        const metafields: Array<Record<string, unknown>> = [];

        if (metaDescription) {
            metafields.push({
                namespace: "global",
                key: "description_tag",
                value: metaDescription,
                type: "single_line_text_field",
            });
        }

        if (metaDescription) {
            metafields.push({
                namespace: "global",
                key: "title_tag",
                value: title,
                type: "single_line_text_field",
            });
        }

        // Add custom metafields for attributes
        if (attributes?.material) {
            metafields.push({
                namespace: "custom",
                key: "material",
                value: attributes.material,
                type: "single_line_text_field",
            });
        }

        if (attributes?.stone && attributes.stone !== "None") {
            metafields.push({
                namespace: "custom",
                key: "stone",
                value: attributes.stone,
                type: "single_line_text_field",
            });
        }

        if (attributes?.closure) {
            metafields.push({
                namespace: "custom",
                key: "closure",
                value: attributes.closure,
                type: "single_line_text_field",
            });
        }

        if (metafields.length > 0) {
            product.metafields = metafields;
        }

        // Add image if available
        if (imageUrl) {
            if (imageUrl.startsWith("data:")) {
                // Base64 image
                const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, "");
                product.images = [
                    {
                        attachment: base64Data,
                        alt: altText || title,
                    },
                ];
            } else {
                // URL-based image
                product.images = [
                    {
                        src: imageUrl,
                        alt: altText || title,
                    },
                ];
            }
        }

        // Call Shopify Admin API
        const shopifyRes = await fetch(
            `https://${storeUrl}/admin/api/2024-04/products.json`,
            {
                method: "POST",
                headers: {
                    "X-Shopify-Access-Token": accessToken,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ product }),
            }
        );

        if (!shopifyRes.ok) {
            const errBody = await shopifyRes.text();
            console.error("Shopify API error:", shopifyRes.status, errBody);
            return NextResponse.json(
                {
                    error: `Shopify error (${shopifyRes.status}): ${errBody.slice(0, 300)}`,
                },
                { status: shopifyRes.status === 401 ? 401 : 500 }
            );
        }

        const shopifyData = await shopifyRes.json();
        const createdProduct = shopifyData.product;

        return NextResponse.json({
            success: true,
            product: {
                id: createdProduct.id,
                title: createdProduct.title,
                handle: createdProduct.handle,
                status: createdProduct.status,
                adminUrl: `https://${storeUrl}/admin/products/${createdProduct.id}`,
                previewUrl: `https://${storeUrl}/products/${createdProduct.handle}`,
            },
        });
    } catch (error) {
        console.error("Shopify push error:", error);
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : "Failed to push to Shopify",
            },
            { status: 500 }
        );
    }
}
