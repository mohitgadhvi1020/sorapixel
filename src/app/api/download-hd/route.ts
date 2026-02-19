import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/auth";
import { getClientId, trackDownload } from "@/lib/track-usage";

export async function GET(req: NextRequest) {
  const label = req.nextUrl.searchParams.get("label");

  if (!label) {
    return NextResponse.json(
      { error: "Missing label parameter" },
      { status: 400 }
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Storage not configured" },
      { status: 501 }
    );
  }

  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }

  try {
    const sb = getSupabaseServer();
    const hdLabel = `${label} HD`;

    const { data: image, error: imgError } = await sb
      .from("images")
      .select("id, storage_path, label, client_id")
      .eq("client_id", clientId)
      .eq("label", hdLabel)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (imgError || !image) {
      return NextResponse.json(
        { error: "HD image not found" },
        { status: 404 }
      );
    }

    const { data: fileData, error: downloadError } = await sb.storage
      .from("sorapixel-images")
      .download(image.storage_path);

    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      return NextResponse.json(
        { error: "Failed to download HD image" },
        { status: 500 }
      );
    }

    await trackDownload({ imageId: image.id, clientId });

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const fileName = `sorapixel-${label.toLowerCase().replace(/\s+/g, "-")}-hd-${Date.now()}.png`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("HD download error:", error);
    return NextResponse.json(
      { error: "HD download failed" },
      { status: 500 }
    );
  }
}
