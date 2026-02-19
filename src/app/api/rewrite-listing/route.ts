import { NextRequest, NextResponse } from "next/server";
import { withRetry } from "@/lib/gemini";
import { GoogleGenAI } from "@google/genai";
import { getClientId, trackGeneration } from "@/lib/track-usage";
import {
  STYLIKA_PROMPT,
  LISTING_JSON_SCHEMA as OUTPUT_JSON_SCHEMA,
  type ListingOutput,
} from "@/lib/listing-prompt";

export const maxDuration = 45;

let _ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

interface RewriteResponse {
  success: boolean;
  listing?: ListingOutput;
  error?: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<RewriteResponse>> {
  try {
    const {
      imageBase64,
      rawTitle,
      rawDescription,
      jewelryType,
      mode,
      recolorColor,
    } = await req.json();

    const isAutoGenerate = mode === "auto";
    const isRefine = mode === "refine";

    if (!isAutoGenerate && !rawTitle?.trim() && !rawDescription?.trim() && !imageBase64) {
      return NextResponse.json(
        { success: false, error: "Please provide an image, title, or description" },
        { status: 400 }
      );
    }

    const ai = getClient();

    let prompt: string;
    const recolorNote = recolorColor?.trim()
      ? `\nIMPORTANT — METAL COLOR: This jewelry has been recolored to "${recolorColor.trim()}". The listing MUST reflect this color as the metal finish in the title context, description, alt text, and the "color" attribute. Apply proper material language rules (e.g. if recolored to "Silver" → use "Silver-tone" or "Rhodium-plated finish").`
      : "";

    if (isAutoGenerate) {
      prompt = `${STYLIKA_PROMPT}

TASK: Analyze the product image and generate a COMPLETE Shopify-ready listing following ALL guidelines above.

JEWELRY TYPE (user-selected): ${jewelryType || "jewelry"}
${rawTitle?.trim() ? `SELLER'S TITLE HINT: "${rawTitle.trim()}"` : ""}
${rawDescription?.trim() ? `SELLER'S NOTES: "${rawDescription.trim()}"` : ""}${recolorNote}

Look at the image carefully. Identify the metal finish, stones, design style, closure type, and complexity. Then generate the full listing.

OUTPUT FORMAT (strict JSON, nothing else):
${OUTPUT_JSON_SCHEMA}`;
    } else if (isRefine) {
      prompt = `${STYLIKA_PROMPT}

TASK: The seller has reviewed and possibly edited their listing. Refine it further — improve clarity, ensure compliance with ALL Stylika guidelines above, and make it more compelling. Respect the seller's edits and intent.

CURRENT TITLE: "${rawTitle || ""}"
CURRENT DESCRIPTION: "${rawDescription || ""}"
JEWELRY TYPE: ${jewelryType || "jewelry"}${recolorNote}

Ensure the output passes the Quality Checklist. Fix any material language violations. Ensure title ends with " | Stylika" and is 50-65 chars.

OUTPUT FORMAT (strict JSON, nothing else):
${OUTPUT_JSON_SCHEMA}`;
    } else {
      prompt = `${STYLIKA_PROMPT}

TASK: Rewrite the seller's raw input into a polished, Stylika-compliant Shopify listing following ALL guidelines above.

RAW TITLE: "${rawTitle || ""}"
RAW DESCRIPTION: "${rawDescription || ""}"
JEWELRY TYPE: ${jewelryType || "jewelry"}${recolorNote}
${imageBase64 ? "\nAnalyze the product image to infer material, stones, style, collection, and category." : ""}

OUTPUT FORMAT (strict JSON, nothing else):
${OUTPUT_JSON_SCHEMA}`;
    }

    // Build contents — text + optional image
    const contents: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
    ];

    if (imageBase64) {
      const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
      const mime = mimeMatch ? mimeMatch[1] : "image/png";
      const data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      contents.push({ inlineData: { mimeType: mime, data } });
    }

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
      })
    );

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("No response from AI");
    }

    try {
      const cleaned = text
        .trim()
        .replace(/^```json?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      const parsed = JSON.parse(cleaned);

      const a = parsed.attributes || {};
      const listing: ListingOutput = {
        title: parsed.title || "",
        description: parsed.description || "",
        metaDescription: parsed.metaDescription || "",
        altText: parsed.altText || "",
        attributes: {
          jewelryMaterial: a.jewelryMaterial || "Metal",
          gemstoneType: a.gemstoneType ?? "",
          collection: a.collection || "[TBD]",
          occasion: a.occasion || "[TBD]",
          material: a.material || "[TBD]",
          stone: a.stone || "None",
          closure: a.closure ?? "",
        },
      };

      // Track usage (non-blocking)
      const clientId = await getClientId();
      if (clientId) {
        const usage = response.usageMetadata;
        trackGeneration({
          clientId,
          generationType: "listing",
          tokenUsage: usage
            ? {
                inputTokens: usage.promptTokenCount ?? 0,
                outputTokens: usage.candidatesTokenCount ?? 0,
                totalTokens: usage.totalTokenCount ?? 0,
              }
            : null,
          model: "gemini-2.5-flash",
        }).catch((err) => console.error("Listing tracking error:", err));
      }

      return NextResponse.json({ success: true, listing });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to parse AI response" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Rewrite listing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Something went wrong",
      },
      { status: 500 }
    );
  }
}
