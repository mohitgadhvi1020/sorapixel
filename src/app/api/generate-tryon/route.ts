import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { withRetry } from "@/lib/gemini";

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

const JEWELRY_PROMPTS: Record<string, string> = {
  necklace: `The FIRST image is a necklace/pendant jewelry piece. The SECOND image is a photo of a person.

Generate a HYPER-REALISTIC photograph of this EXACT person wearing this EXACT necklace. Critical rules:
- The person's face, hair, skin tone, clothing, body, and pose must remain COMPLETELY IDENTICAL — do not alter ANY facial features, expression, or appearance
- The necklace must look EXACTLY like the one in the first image — same design, color, material, gems, chain style, every detail preserved
- Place the necklace naturally around the person's neck at the correct anatomical position
- Match the lighting, color temperature, and shadows of the person's photo — the necklace should look like it was there when the photo was taken
- Add realistic shadows under the necklace on the skin/clothing
- The necklace should have correct perspective matching the person's pose and angle
- Output should be indistinguishable from a real photograph`,

  earring: `The FIRST image is an earring jewelry piece. The SECOND image is a photo of a person.

Generate a HYPER-REALISTIC photograph of this EXACT person wearing this EXACT earring (on both ears if it's a pair, or on the visible ear). Critical rules:
- The person's face, hair, skin tone, clothing, body, and pose must remain COMPLETELY IDENTICAL — do not alter ANY facial features, expression, or appearance
- The earring must look EXACTLY like the one in the first image — same design, color, material, gems, every detail preserved
- Place the earring naturally on the ear(s) at the correct anatomical position, hanging naturally with gravity
- Match the lighting, color temperature, and shadows of the person's photo
- Add realistic reflections and shadows consistent with the lighting
- The earring should have correct perspective and scale relative to the ear
- Output should be indistinguishable from a real photograph`,

  bracelet: `The FIRST image is a bracelet/bangle jewelry piece. The SECOND image is a photo of a person.

Generate a HYPER-REALISTIC photograph of this EXACT person wearing this EXACT bracelet on their wrist. Critical rules:
- The person's face, hair, skin tone, clothing, body, and pose must remain COMPLETELY IDENTICAL — do not alter ANY facial features, expression, or appearance
- The bracelet must look EXACTLY like the one in the first image — same design, color, material, gems, every detail preserved
- Place the bracelet naturally around the wrist at the correct anatomical position
- If the wrist is not clearly visible, show the person with their arm/wrist in a natural position wearing the bracelet
- Match the lighting, color temperature, and shadows of the person's photo
- Add realistic shadows and reflections on the skin
- Output should be indistinguishable from a real photograph`,

  ring: `The FIRST image is a ring jewelry piece. The SECOND image is a photo of a person.

Generate a HYPER-REALISTIC photograph of this EXACT person wearing this EXACT ring on their finger. Critical rules:
- The person's face, hair, skin tone, clothing, body, and pose must remain COMPLETELY IDENTICAL — do not alter ANY facial features, expression, or appearance
- The ring must look EXACTLY like the one in the first image — same design, color, material, gems, band style, every detail preserved
- Place the ring naturally on an appropriate finger at the correct anatomical position
- If the hand is not clearly visible, show the person with their hand in a natural elegant position displaying the ring
- Match the lighting, color temperature, and shadows of the person's photo
- Add realistic shadows and reflections
- Output should be indistinguishable from a real photograph`,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { jewelryBase64, personBase64, jewelryType } = body;

    if (!jewelryBase64 || !personBase64) {
      return NextResponse.json(
        { success: false, error: "Both jewelry and person images are required" },
        { status: 400 }
      );
    }

    const type = jewelryType || "necklace";
    const prompt = JEWELRY_PROMPTS[type] || JEWELRY_PROMPTS.necklace;

    // Detect mime types
    const jewelryMime =
      jewelryBase64.match(/^data:(image\/\w+);base64,/)?.[1] || "image/png";
    const personMime =
      personBase64.match(/^data:(image\/\w+);base64,/)?.[1] || "image/png";

    const jewelryData = jewelryBase64.replace(/^data:image\/\w+;base64,/, "");
    const personData = personBase64.replace(/^data:image\/\w+;base64,/, "");

    console.log(`Generating virtual try-on (${type}) with Gemini...`);

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

    console.log("Virtual try-on complete!");

    return NextResponse.json({
      success: true,
      image: {
        base64: resultBase64,
        mimeType: resultMimeType,
      },
    });
  } catch (error) {
    console.error("Try-on generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
