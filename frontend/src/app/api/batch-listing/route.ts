import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  STYLIKA_PROMPT,
  LISTING_JSON_SCHEMA,
  type ListingOutput,
  type BrandConfig,
  buildBrandListingPrompt,
} from "@/lib/listing-prompt";
import { LISTING_PRICING } from "@/lib/token-pricing";

export const maxDuration = 60;

const TOKENS_PER_IMAGE = LISTING_PRICING.costPerImage;
const TOKENS_PER_REGEN = LISTING_PRICING.costPerRegen;
const MAX_RETRIES = 3;

async function getAuthUserId(): Promise<string | null> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

async function checkTokenBalance(clientId: string, cost: number = TOKENS_PER_IMAGE): Promise<{ ok: boolean; balance: number }> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("clients")
    .select("token_balance")
    .eq("id", clientId)
    .single();

  if (error || !data) return { ok: false, balance: 0 };
  const current = data.token_balance ?? 0;
  return current >= cost ? { ok: true, balance: current } : { ok: false, balance: current };
}

async function deductTokens(clientId: string, cost: number = TOKENS_PER_IMAGE): Promise<number> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("clients")
    .select("token_balance")
    .eq("id", clientId)
    .single();

  const current = data?.token_balance ?? 0;
  const newBalance = Math.max(0, current - cost);
  await sb.from("clients").update({ token_balance: newBalance }).eq("id", clientId);
  return newBalance;
}

let _ai: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

async function withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Max retries reached");
}

function parseListingResponse(text: string): ListingOutput {
  const cleaned = text
    .trim()
    .replace(/^```json?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const parsed = JSON.parse(cleaned);
  const a = parsed.attributes || {};
  return {
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
}

async function fetchBrandConfig(clientId: string): Promise<BrandConfig | null> {
  const sb = getSupabaseAdmin();
  const { data: clientData } = await sb
    .from("clients")
    .select("brand_id")
    .eq("id", clientId)
    .single();
  if (!clientData?.brand_id) return null;

  const { data: brandData } = await sb
    .from("brand_profiles")
    .select("config")
    .eq("id", clientData.brand_id)
    .single();
  return (brandData?.config as BrandConfig) || null;
}

async function generateListing(imageBase64: string, batchDescription?: string, brandConfig?: BrandConfig | null) {
  const ai = getClient();

  const jewelryType = batchDescription?.trim() || "jewelry";
  const jewelryTypeInstruction = batchDescription?.trim()
    ? `JEWELRY TYPE (USER-CONFIRMED — MANDATORY): The user has explicitly confirmed that this product is: "${batchDescription.trim()}"
You MUST use this product type in the title, description, category, and all attributes.
Do NOT override, change, or second-guess this classification — even if the image looks ambiguous.
The title MUST reflect this is a ${batchDescription.trim()}.`
    : `JEWELRY TYPE (auto-detect): Analyze the image to determine the jewelry type.`;

  let basePrompt: string;
  if (brandConfig) {
    basePrompt = buildBrandListingPrompt(brandConfig, jewelryType);
  } else {
    basePrompt = `${STYLIKA_PROMPT}

TASK: Analyze the product image and generate a COMPLETE Shopify-ready listing following ALL guidelines above.

OUTPUT FORMAT (strict JSON, nothing else):
${LISTING_JSON_SCHEMA}`;
  }

  const prompt = `${basePrompt}

${jewelryTypeInstruction}

Look at the image carefully. Identify the metal finish, stones, design style, closure type, and complexity. Then generate the full listing.`;

  const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
  const mime = mimeMatch ? mimeMatch[1] : "image/png";
  const data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { text: prompt },
        { inlineData: { mimeType: mime, data } },
      ],
    })
  );

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from AI");

  const listing = parseListingResponse(text);
  const usage = response.usageMetadata;
  const tokenUsage = usage
    ? { inputTokens: usage.promptTokenCount ?? 0, outputTokens: usage.candidatesTokenCount ?? 0, totalTokens: usage.totalTokenCount ?? 0 }
    : undefined;

  return { listing, tokenUsage };
}

async function uploadImage(clientId: string, base64: string, label: string) {
  try {
    const sb = getSupabaseAdmin();
    const raw = base64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(raw, "base64");
    const fileName = `${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.png`;
    const storagePath = `${clientId}/${fileName}`;

    const { error } = await sb.storage
      .from("soraipixel-images")
      .upload(storagePath, buffer, { contentType: "image/png", upsert: false });

    if (error) { console.error("Storage upload error:", error.message); return null; }
    return { path: storagePath, size: buffer.length };
  } catch (err) {
    console.error("Upload image error:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body;

    const clientId = await getAuthUserId();
    if (!clientId) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const brandConfig = await fetchBrandConfig(clientId);

    if (mode === "generate") {
      const { imageBase64, filename, batchId, batchDescription } = body;
      if (!imageBase64 || !batchId) {
        return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
      }

      const tokenCheck = await checkTokenBalance(clientId);
      if (!tokenCheck.ok) {
        return NextResponse.json({
          success: false,
          error: `Insufficient listing tokens. You have ${tokenCheck.balance} tokens, but each image costs ${TOKENS_PER_IMAGE}.`,
          code: "INSUFFICIENT_TOKENS",
          balance: tokenCheck.balance,
        }, { status: 403 });
      }

      let listing: ListingOutput;
      try {
        const result = await generateListing(imageBase64, batchDescription, brandConfig);
        listing = result.listing;
      } catch (aiError) {
        console.error("AI generation failed:", aiError);
        return NextResponse.json({
          success: false,
          error: "AI generation failed. No tokens were deducted. Please try again.",
          code: "AI_GENERATION_FAILED",
          balance: tokenCheck.balance,
        }, { status: 500 });
      }

      const newBalance = await deductTokens(clientId);
      const label = `batch-${(filename || "image").replace(/\.[^.]+$/, "")}`;
      const uploaded = await uploadImage(clientId, imageBase64, label);

      let dbId: string | undefined;
      {
        const sb = getSupabaseAdmin();
        const { data, error } = await sb
          .from("batch_listings")
          .insert({
            client_id: clientId,
            batch_id: batchId,
            batch_description: batchDescription || "",
            image_storage_path: uploaded?.path || null,
            original_filename: filename || "unknown",
            title: listing.title,
            description: listing.description,
            meta_description: listing.metaDescription,
            alt_text: listing.altText,
            attributes: listing.attributes,
            status: "completed",
          })
          .select("id")
          .single();
        if (error) console.error("Failed to save batch listing:", error.message);
        else if (data) dbId = data.id;
      }

      return NextResponse.json({
        success: true,
        balance: newBalance,
        item: {
          id: dbId,
          title: listing.title,
          description: listing.description,
          metaDescription: listing.metaDescription,
          altText: listing.altText,
          attributes: listing.attributes,
          storagePath: uploaded?.path,
        },
      });
    }

    if (mode === "regenerate") {
      const { itemId, imageBase64, batchDescription } = body;
      if (!imageBase64) {
        return NextResponse.json({ success: false, error: "Image is required for regeneration" }, { status: 400 });
      }

      const tokenCheck = await checkTokenBalance(clientId, TOKENS_PER_REGEN);
      if (!tokenCheck.ok) {
        return NextResponse.json({
          success: false,
          error: `Insufficient listing tokens. You have ${tokenCheck.balance} tokens, but regeneration costs ${TOKENS_PER_REGEN}.`,
          code: "INSUFFICIENT_TOKENS",
          balance: tokenCheck.balance,
        }, { status: 403 });
      }

      let listing: ListingOutput;
      try {
        const result = await generateListing(imageBase64, batchDescription, brandConfig);
        listing = result.listing;
      } catch (aiError) {
        console.error("AI regeneration failed:", aiError);
        return NextResponse.json({
          success: false,
          error: "AI regeneration failed. No tokens were deducted. Please try again.",
          code: "AI_GENERATION_FAILED",
          balance: tokenCheck.balance,
        }, { status: 500 });
      }

      const newBalance = await deductTokens(clientId, TOKENS_PER_REGEN);

      if (itemId) {
        const sb = getSupabaseAdmin();
        await sb.from("batch_listings").update({
          title: listing.title,
          description: listing.description,
          meta_description: listing.metaDescription,
          alt_text: listing.altText,
          attributes: listing.attributes,
          updated_at: new Date().toISOString(),
        }).eq("id", itemId).eq("client_id", clientId);
      }

      return NextResponse.json({
        success: true,
        balance: newBalance,
        item: {
          id: itemId,
          title: listing.title,
          description: listing.description,
          metaDescription: listing.metaDescription,
          altText: listing.altText,
          attributes: listing.attributes,
        },
      });
    }

    if (mode === "save") {
      const { itemId, title, description, metaDescription, altText, attributes } = body;
      if (!itemId) {
        return NextResponse.json({ success: false, error: "Item ID is required" }, { status: 400 });
      }

      const sb = getSupabaseAdmin();
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (metaDescription !== undefined) updateData.meta_description = metaDescription;
      if (altText !== undefined) updateData.alt_text = altText;
      if (attributes !== undefined) updateData.attributes = attributes;

      await sb.from("batch_listings").update(updateData).eq("id", itemId).eq("client_id", clientId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: "Invalid mode" }, { status: 400 });
  } catch (error) {
    console.error("Batch listing error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 }
    );
  }
}
