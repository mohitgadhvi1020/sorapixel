import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 60;

let _ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, prompt, aspectRatio } = body;

    if (!prompt) {
      return NextResponse.json(
        { success: false, error: "Missing prompt" },
        { status: 400 }
      );
    }

    // Build image payload if provided (image-to-video)
    let image: { imageBytes: string; mimeType: string } | undefined;

    if (imageBase64) {
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
      const mimeType = mimeMatch ? mimeMatch[1] : "image/png";
      const cleaned = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      image = { imageBytes: cleaned, mimeType };
    }

    console.log(
      `Starting Veo video generation | Image: ${image ? "yes" : "no"} | Ratio: ${aspectRatio || "16:9"}`
    );

    const ai = getClient();

    const operation = await ai.models.generateVideos({
      model: "veo-3.0-generate-001",
      prompt,
      ...(image ? { image } : {}),
      config: {
        aspectRatio: aspectRatio || "16:9",
      },
    });

    // Extract operation name for polling
    const name = (operation as unknown as { name?: string }).name;

    if (!name) {
      throw new Error("No operation name returned — video generation may not have started");
    }

    console.log(`Veo operation started: ${name}`);

    return NextResponse.json({ success: true, name });
  } catch (error) {
    console.error("Veo generate error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to start video generation",
      },
      { status: 500 }
    );
  }
}
