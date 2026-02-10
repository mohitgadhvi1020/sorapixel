import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { withRetry } from "@/lib/gemini";
import { JEWELRY_TRYON_PROMPTS } from "@/lib/jewelry-styles";
import { getRatioById, DEFAULT_RATIO } from "@/lib/aspect-ratios";
import { cropToRatio } from "@/lib/crop-to-ratio";

export const maxDuration = 120;

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
    const { jewelryBase64, personBase64, jewelryType, aspectRatioId } = body;

    const ratio = getRatioById(aspectRatioId) || DEFAULT_RATIO;

    if (!jewelryBase64 || !personBase64) {
      return NextResponse.json(
        {
          success: false,
          error: "Both jewelry and person images are required",
        },
        { status: 400 }
      );
    }

    const type = jewelryType || "necklace";
    const basePrompt =
      JEWELRY_TRYON_PROMPTS[type] || JEWELRY_TRYON_PROMPTS.necklace;
    const prompt = `${basePrompt}\n\nCOMPOSITION: ${ratio.compositionHint}`;

    // Detect mime types
    const jewelryMime =
      jewelryBase64.match(/^data:(image\/\w+);base64,/)?.[1] || "image/png";
    const personMime =
      personBase64.match(/^data:(image\/\w+);base64,/)?.[1] || "image/png";

    const jewelryData = jewelryBase64.replace(/^data:image\/\w+;base64,/, "");
    const personData = personBase64.replace(/^data:image\/\w+;base64,/, "");

    console.log(
      `Generating jewelry try-on (${type}) with ultra-fidelity prompts...`
    );

    const ai = getClient();

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          { text: prompt },
          { inlineData: { mimeType: jewelryMime, data: jewelryData } },
          { inlineData: { mimeType: personMime, data: personData } },
        ],
        config: {
          responseModalities: ["IMAGE"],
        },
      })
    );

    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      throw new Error(
        "AI returned no content. The image may have been blocked by safety filters. Try different photos."
      );
    }

    let resultBase64 = "";
    let resultMimeType = "image/png";

    for (const part of parts) {
      if (part.inlineData) {
        resultBase64 = part.inlineData.data!;
        resultMimeType = part.inlineData.mimeType || "image/png";
      }
    }

    if (!resultBase64) {
      const textPart = parts.find((p) => p.text);
      throw new Error(
        "AI did not return an image. " + (textPart?.text || "Try again.")
      );
    }

    // Crop to exact aspect ratio
    console.log(`Cropping jewelry try-on to ${ratio.width}x${ratio.height}...`);
    try {
      resultBase64 = await cropToRatio(
        resultBase64,
        ratio.width,
        ratio.height,
        !!ratio.circular
      );
      resultMimeType = "image/png";
    } catch (err) {
      console.error("Crop failed for jewelry try-on:", err);
    }

    console.log("Jewelry try-on complete!");

    return NextResponse.json({
      success: true,
      image: {
        base64: resultBase64,
        mimeType: resultMimeType,
      },
    });
  } catch (error) {
    console.error("Jewelry try-on error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
