import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const uri: string | undefined = body?.uri;

    if (!uri) {
      return NextResponse.json(
        { success: false, error: "Missing file URI" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "GEMINI_API_KEY not set" },
        { status: 500 }
      );
    }

    const resp = await fetch(uri, {
      headers: {
        "x-goog-api-key": apiKey,
        Accept: "*/*",
      },
      redirect: "follow",
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      return NextResponse.json(
        {
          success: false,
          error: `Download failed: ${resp.status} ${resp.statusText}`,
          details: text,
        },
        { status: 502 }
      );
    }

    // Stream the video back
    if (resp.body) {
      return new Response(resp.body, {
        status: 200,
        headers: {
          "Content-Type": resp.headers.get("content-type") || "video/mp4",
          "Content-Disposition": `inline; filename="sorapixel-video.mp4"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const arrayBuffer = await resp.arrayBuffer();
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": resp.headers.get("content-type") || "video/mp4",
        "Content-Disposition": `inline; filename="sorapixel-video.mp4"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Veo download error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to download video",
      },
      { status: 500 }
    );
  }
}
