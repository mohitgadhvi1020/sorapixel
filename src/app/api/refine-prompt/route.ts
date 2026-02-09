import { NextRequest, NextResponse } from "next/server";
import { refinePrompt } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { rawPrompt } = await req.json();

    if (!rawPrompt || typeof rawPrompt !== "string" || !rawPrompt.trim()) {
      return NextResponse.json(
        { success: false, error: "No prompt provided" },
        { status: 400 }
      );
    }

    const refined = await refinePrompt(rawPrompt.trim());

    return NextResponse.json({ success: true, refined });
  } catch (error) {
    console.error("Prompt refinement error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to refine prompt",
      },
      { status: 500 }
    );
  }
}
