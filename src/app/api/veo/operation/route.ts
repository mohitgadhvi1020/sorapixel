import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const maxDuration = 30;

let _ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

interface VeoOperation {
  done?: boolean;
  name?: string;
  response?: {
    generatedVideos?: Array<{
      video?: { uri?: string };
    }>;
  };
  error?: { message?: string };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name as string | undefined;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Missing operation name" },
        { status: 400 }
      );
    }

    const ai = getClient();

    const fresh = (await ai.operations.getVideosOperation({
      operation: { name } as unknown as never,
    })) as unknown as VeoOperation;

    // Check if done
    if (fresh.done) {
      // Check for error
      if (fresh.error) {
        return NextResponse.json({
          success: false,
          done: true,
          error: fresh.error.message || "Video generation failed",
        });
      }

      // Extract video URI(s)
      const videos =
        fresh.response?.generatedVideos
          ?.map((v) => v.video?.uri)
          .filter(Boolean) || [];

      return NextResponse.json({
        success: true,
        done: true,
        videos,
      });
    }

    // Still processing
    return NextResponse.json({
      success: true,
      done: false,
    });
  } catch (error) {
    console.error("Veo poll error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to poll operation",
      },
      { status: 500 }
    );
  }
}
