import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/auth";
import { getClientId, trackDownload } from "@/lib/track-usage";

export async function GET(req: NextRequest) {
  const imageId = req.nextUrl.searchParams.get("imageId");

  if (!imageId) {
    return NextResponse.json(
      { error: "Missing imageId parameter" },
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

    // Get the image record
    const { data: image, error: imgError } = await sb
      .from("images")
      .select("id, storage_path, label, client_id")
      .eq("id", imageId)
      .single();

    if (imgError || !image) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    // Ensure the client owns this image
    if (image.client_id !== clientId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Download from storage
    const { data: fileData, error: downloadError } = await sb.storage
      .from("sorapixel-images")
      .download(image.storage_path);

    if (downloadError || !fileData) {
      console.error("Storage download error:", downloadError);
      return NextResponse.json(
        { error: "Failed to download image" },
        { status: 500 }
      );
    }

    // Log the download
    await trackDownload({ imageId: image.id, clientId });

    // Return the image as a file download
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const fileName = `sorapixel-${image.label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Download failed" },
      { status: 500 }
    );
  }
}
