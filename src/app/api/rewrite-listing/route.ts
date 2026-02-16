import { NextRequest, NextResponse } from "next/server";
import { withRetry } from "@/lib/gemini";
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

interface RewriteResponse {
  success: boolean;
  title?: string;
  description?: string;
  bulletPoints?: string[];
  tags?: string[];
  error?: string;
}

const LISTING_JSON_SCHEMA = `{
  "title": "Optimized product title (60-80 chars, include key material, type, style keywords)",
  "description": "Professional product description (2-3 paragraphs, compelling, highlights craftsmanship, materials, occasions, care instructions if relevant)",
  "bulletPoints": ["Key feature 1", "Key feature 2", "Key feature 3", "Key feature 4", "Key feature 5"],
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8"]
}`;

const LISTING_RULES = `RULES:
- Title: Concise, keyword-rich, professional. Include material (gold, silver, etc.) if mentioned. Include type (ring, necklace, bracelet, etc.).
- Description: Elegant, persuasive, highlight craftsmanship and uniqueness. Mention occasions (wedding, gifting, daily wear). Do NOT invent specific materials/stones unless mentioned in the input — stay faithful to what is known about the product.
- Bullet Points: 5 clear, scannable selling points. Start each with a bold keyword.
- Tags: 8 relevant SEO tags/keywords for marketplace search.
- Keep the tone luxurious but not over-the-top. Professional and trustworthy.
- If the input mentions specific details (weight, size, material, stone type), preserve them EXACTLY.
- Output ONLY the JSON object — no preamble, no markdown fences.`;

export async function POST(
  req: NextRequest
): Promise<NextResponse<RewriteResponse>> {
  try {
    const {
      rawTitle,
      rawDescription,
      jewelryType,
      detailManifest,
      mode,
    } = await req.json();

    const isAutoGenerate = mode === "auto";
    const isRefine = mode === "refine";

    if (!isAutoGenerate && !rawTitle?.trim() && !rawDescription?.trim()) {
      return NextResponse.json(
        { success: false, error: "Please provide a title or description" },
        { status: 400 }
      );
    }

    if (isAutoGenerate && !detailManifest?.trim() && !jewelryType?.trim() && !rawTitle?.trim() && !rawDescription?.trim()) {
      return NextResponse.json(
        { success: false, error: "No product details available for auto-generation" },
        { status: 400 }
      );
    }

    const ai = getClient();

    let prompt: string;

    if (isAutoGenerate) {
      prompt = `You are an expert e-commerce copywriter specializing in jewelry and luxury products. Based on the AI-extracted product details below, generate a polished, professional, SEO-optimized e-commerce listing that is ready to upload directly to marketplaces like Amazon, Flipkart, Etsy, or any jewelry e-commerce platform.

JEWELRY TYPE: ${jewelryType || "jewelry"}
${detailManifest ? `\nPRODUCT DETAILS (extracted from product images):\n${detailManifest}` : ""}
${rawTitle?.trim() ? `\nSELLER'S TITLE: "${rawTitle.trim()}"` : ""}
${rawDescription?.trim() ? `\nSELLER'S DESCRIPTION: "${rawDescription.trim()}"` : ""}

OUTPUT FORMAT (strict JSON, nothing else):
${LISTING_JSON_SCHEMA}

${LISTING_RULES}`;
    } else if (isRefine) {
      prompt = `You are an expert e-commerce copywriter. The seller has reviewed and possibly edited their product listing. Refine and improve it further — make it more compelling, better optimized for SEO, and more professional while keeping the seller's edits and intent.

CURRENT TITLE: "${rawTitle || ""}"
CURRENT DESCRIPTION: "${rawDescription || ""}"
JEWELRY TYPE: ${jewelryType || "jewelry"}
${detailManifest ? `\nPRODUCT DETAILS (from images):\n${detailManifest}` : ""}

OUTPUT FORMAT (strict JSON, nothing else):
${LISTING_JSON_SCHEMA}

${LISTING_RULES}
- IMPORTANT: Respect the seller's current wording and intent. Improve clarity, SEO, and persuasiveness without changing the core meaning.`;
    } else {
      prompt = `You are an expert e-commerce copywriter specializing in jewelry and luxury products. A seller has given you their raw product title and description. Rewrite them into polished, professional, SEO-optimized e-commerce listing content that is ready to upload directly to marketplaces like Amazon, Flipkart, Etsy, or any jewelry e-commerce platform.

RAW TITLE: "${rawTitle || ""}"
RAW DESCRIPTION: "${rawDescription || ""}"
JEWELRY TYPE: ${jewelryType || "jewelry"}
${detailManifest ? `\nPRODUCT DETAILS (from images):\n${detailManifest}` : ""}

OUTPUT FORMAT (strict JSON, nothing else):
${LISTING_JSON_SCHEMA}

${LISTING_RULES}`;
    }

    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ text: prompt }],
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

      return NextResponse.json({
        success: true,
        title: parsed.title || rawTitle || "",
        description: parsed.description || rawDescription || "",
        bulletPoints: parsed.bulletPoints || [],
        tags: parsed.tags || [],
      });
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
