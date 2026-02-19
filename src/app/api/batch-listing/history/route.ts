import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/auth";
import { getClientId } from "@/lib/track-usage";

/**
 * GET /api/batch-listing/history — fetch past batch listings for the current user
 * Query params: ?page=1&limit=50
 */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [], total: 0 });
  }

  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50", 10)));
  const offset = (page - 1) * limit;

  const sb = getSupabaseServer();

  const { count } = await sb
    .from("batch_listings")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId);

  const { data, error } = await sb
    .from("batch_listings")
    .select("id, batch_id, image_storage_path, original_filename, title, description, meta_description, alt_text, attributes, status, created_at")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = await Promise.all(
    (data || []).map(async (row) => {
      let imageUrl = "";
      if (row.image_storage_path) {
        const { data: signedData } = await sb.storage
          .from("sorapixel-images")
          .createSignedUrl(row.image_storage_path, 3600);
        imageUrl = signedData?.signedUrl || "";
      }

      return {
        id: row.id,
        batchId: row.batch_id,
        imageUrl,
        filename: row.original_filename,
        title: row.title,
        description: row.description,
        metaDescription: row.meta_description,
        altText: row.alt_text,
        attributes: row.attributes || {},
        status: row.status,
        createdAt: row.created_at,
      };
    })
  );

  return NextResponse.json({
    items,
    total: count ?? 0,
    page,
    limit,
  });
}
