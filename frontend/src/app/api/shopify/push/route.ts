import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const sb = getSupabaseAdmin();
    const { data: clientData } = await sb
      .from("clients")
      .select("shopify_store_url, shopify_access_token")
      .eq("id", user.id)
      .single();

    const storeUrl = clientData?.shopify_store_url || "";
    const accessToken = clientData?.shopify_access_token || "";
    if (!storeUrl || !accessToken) {
      return NextResponse.json({ error: "Shopify is not connected." }, { status: 400 });
    }

    const body = await req.json();
    const { title, description, metaDescription, altText, attributes, imageUrl } = body;
    if (!title) return NextResponse.json({ error: "Product title is required" }, { status: 400 });

    const tags: string[] = [];
    if (attributes?.collection) tags.push(attributes.collection);
    if (attributes?.occasion) {
      attributes.occasion.split(",").forEach((o: string) => {
        const trimmed = o.trim();
        if (trimmed) tags.push(trimmed);
      });
    }

    const product: Record<string, unknown> = {
      title,
      body_html: description || "",
      vendor: "Stylika",
      product_type: "Fashion Jewelry",
      tags: tags.join(", "),
      status: "draft",
    };

    const metafields: Array<Record<string, unknown>> = [];
    if (metaDescription) {
      metafields.push({ namespace: "global", key: "description_tag", value: metaDescription, type: "single_line_text_field" });
      metafields.push({ namespace: "global", key: "title_tag", value: title, type: "single_line_text_field" });
    }
    if (attributes?.material) metafields.push({ namespace: "custom", key: "material", value: attributes.material, type: "single_line_text_field" });
    if (attributes?.stone && attributes.stone !== "None") metafields.push({ namespace: "custom", key: "stone", value: attributes.stone, type: "single_line_text_field" });
    if (attributes?.closure) metafields.push({ namespace: "custom", key: "closure", value: attributes.closure, type: "single_line_text_field" });
    if (metafields.length > 0) product.metafields = metafields;

    if (imageUrl) {
      if (imageUrl.startsWith("data:")) {
        product.images = [{ attachment: imageUrl.replace(/^data:image\/\w+;base64,/, ""), alt: altText || title }];
      } else {
        product.images = [{ src: imageUrl, alt: altText || title }];
      }
    }

    const shopifyRes = await fetch(`https://${storeUrl}/admin/api/2024-04/products.json`, {
      method: "POST",
      headers: { "X-Shopify-Access-Token": accessToken, "Content-Type": "application/json" },
      body: JSON.stringify({ product }),
    });

    if (!shopifyRes.ok) {
      const errBody = await shopifyRes.text();
      console.error("Shopify API error:", shopifyRes.status, errBody);
      return NextResponse.json({ error: `Shopify error (${shopifyRes.status}): ${errBody.slice(0, 300)}` }, { status: shopifyRes.status === 401 ? 401 : 500 });
    }

    const shopifyData = await shopifyRes.json();
    const created = shopifyData.product;
    return NextResponse.json({
      success: true,
      product: {
        id: created.id,
        title: created.title,
        handle: created.handle,
        status: created.status,
        adminUrl: `https://${storeUrl}/admin/products/${created.id}`,
      },
    });
  } catch (error) {
    console.error("Shopify push error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to push to Shopify" }, { status: 500 });
  }
}
