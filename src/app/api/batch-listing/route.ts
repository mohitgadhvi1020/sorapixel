import { NextRequest, NextResponse } from "next/server";
import { withRetry } from "@/lib/gemini";
import { GoogleGenAI } from "@google/genai";
import { getClientId, trackGeneration, uploadImage } from "@/lib/track-usage";
import { getSupabaseServer } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/auth";
import {
  STYLIKA_PROMPT,
  LISTING_JSON_SCHEMA,
  type ListingOutput,
} from "@/lib/listing-prompt";

export const maxDuration = 60;

const TOKENS_PER_IMAGE = 5;

async function checkAndDeductTokens(clientId: string): Promise<{ ok: boolean; balance: number }> {
  if (!isSupabaseConfigured()) return { ok: true, balance: Infinity };

  const sb = getSupabaseServer();
  const { data, error } = await sb
    .from("clients")
    .select("listing_tokens")
    .eq("id", clientId)
    .single();

  if (error || !data) return { ok: false, balance: 0 };

  const current = data.listing_tokens ?? 0;
  if (current < TOKENS_PER_IMAGE) return { ok: false, balance: current };

  const { error: updateErr } = await sb
    .from("clients")
    .update({ listing_tokens: current - TOKENS_PER_IMAGE })
    .eq("id", clientId);

  if (updateErr) return { ok: false, balance: current };

  return { ok: true, balance: current - TOKENS_PER_IMAGE };
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

async function generateListing(imageBase64: string): Promise<{
  listing: ListingOutput;
  tokenUsage?: { inputTokens: number; outputTokens: number; totalTokens: number };
}> {
  const ai = getClient();

  const prompt = `${STYLIKA_PROMPT}

TASK: Analyze the product image and generate a COMPLETE Shopify-ready listing following ALL guidelines above.

JEWELRY TYPE (auto-detect): Analyze the image to determine the jewelry type.

Look at the image carefully. Identify the metal finish, stones, design style, closure type, and complexity. Then generate the full listing.

OUTPUT FORMAT (strict JSON, nothing else):
${LISTING_JSON_SCHEMA}`;

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
    ? {
        inputTokens: usage.promptTokenCount ?? 0,
        outputTokens: usage.candidatesTokenCount ?? 0,
        totalTokens: usage.totalTokenCount ?? 0,
      }
    : undefined;

  return { listing, tokenUsage };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body;

    const clientId = await getClientId();
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    if (mode === "generate") {
      const { imageBase64, filename, batchId } = body;
      if (!imageBase64 || !batchId) {
        return NextResponse.json(
          { success: false, error: "Missing required fields" },
          { status: 400 }
        );
      }

      const tokenCheck = await checkAndDeductTokens(clientId);
      if (!tokenCheck.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient listing tokens. You have ${tokenCheck.balance} tokens, but each image costs ${TOKENS_PER_IMAGE}. Please contact admin to add more tokens.`,
            code: "INSUFFICIENT_TOKENS",
            balance: tokenCheck.balance,
          },
          { status: 403 }
        );
      }

      const { listing, tokenUsage } = await generateListing(imageBase64);

      const label = `batch-${(filename || "image").replace(/\.[^.]+$/, "")}`;
      const uploaded = await uploadImage(clientId, imageBase64, label);

      let dbId: string | undefined;
      if (isSupabaseConfigured() && uploaded) {
        const sb = getSupabaseServer();
        const { data, error } = await sb
          .from("batch_listings")
          .insert({
            client_id: clientId,
            batch_id: batchId,
            image_storage_path: uploaded.path,
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

        if (error) {
          console.error("Failed to save batch listing:", error.message);
        } else if (data) {
          dbId = data.id;
        }
      }

      trackGeneration({
        clientId,
        generationType: "batch_listing",
        tokenUsage: tokenUsage || null,
        model: "gemini-2.5-flash",
      }).catch((err) => console.error("Batch listing tracking error:", err));

      return NextResponse.json({
        success: true,
        balance: tokenCheck.balance,
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
      const { itemId, imageBase64 } = body;
      if (!imageBase64) {
        return NextResponse.json(
          { success: false, error: "Image is required for regeneration" },
          { status: 400 }
        );
      }

      const tokenCheck = await checkAndDeductTokens(clientId);
      if (!tokenCheck.ok) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient listing tokens. You have ${tokenCheck.balance} tokens, but each image costs ${TOKENS_PER_IMAGE}. Please contact admin to add more tokens.`,
            code: "INSUFFICIENT_TOKENS",
            balance: tokenCheck.balance,
          },
          { status: 403 }
        );
      }

      const { listing, tokenUsage } = await generateListing(imageBase64);

      if (isSupabaseConfigured() && itemId) {
        const sb = getSupabaseServer();
        await sb
          .from("batch_listings")
          .update({
            title: listing.title,
            description: listing.description,
            meta_description: listing.metaDescription,
            alt_text: listing.altText,
            attributes: listing.attributes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", itemId)
          .eq("client_id", clientId);
      }

      trackGeneration({
        clientId,
        generationType: "batch_listing",
        tokenUsage: tokenUsage || null,
        model: "gemini-2.5-flash",
      }).catch((err) => console.error("Batch listing tracking error:", err));

      return NextResponse.json({
        success: true,
        balance: tokenCheck.balance,
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
        return NextResponse.json(
          { success: false, error: "Item ID is required" },
          { status: 400 }
        );
      }

      if (isSupabaseConfigured()) {
        const sb = getSupabaseServer();
        const updateData: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;
        if (metaDescription !== undefined) updateData.meta_description = metaDescription;
        if (altText !== undefined) updateData.alt_text = altText;
        if (attributes !== undefined) updateData.attributes = attributes;

        await sb
          .from("batch_listings")
          .update(updateData)
          .eq("id", itemId)
          .eq("client_id", clientId);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Invalid mode — use generate, regenerate, or save" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Batch listing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Something went wrong",
      },
      { status: 500 }
    );
  }
}
