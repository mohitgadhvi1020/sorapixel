import { NextRequest, NextResponse } from "next/server";
import { generateStudioImage } from "@/lib/gemini";
import { getStyleById } from "@/lib/styles";

export const maxDuration = 120;

interface GenerateResponse {
  success: boolean;
  resultBase64?: string;
  resultMimeType?: string;
  text?: string;
  error?: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<GenerateResponse>> {
  try {
    const body = await req.json();
    const { imageBase64, styleId, customPrompt } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    if (!styleId) {
      return NextResponse.json(
        { success: false, error: "No style selected" },
        { status: 400 }
      );
    }

    const style = getStyleById(styleId);
    if (!style) {
      return NextResponse.json(
        { success: false, error: "Invalid style selected" },
        { status: 400 }
      );
    }

    // Detect mime type from base64 data URI
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    const prompt = customPrompt || style.prompt;

    console.log("Generating with Gemini Nano Banana...");
    console.log("Style:", style.name);

    const result = await generateStudioImage(imageBase64, mimeType, prompt);

    console.log("Generation complete!", result.text || "");

    return NextResponse.json({
      success: true,
      resultBase64: result.resultBase64,
      resultMimeType: result.resultMimeType,
      text: result.text,
    });
  } catch (error) {
    console.error("Generation error:", error);
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
