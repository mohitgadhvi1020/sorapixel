import { NextRequest, NextResponse } from "next/server";
import { withRetry } from "@/lib/gemini";
import { GoogleGenAI } from "@google/genai";

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

interface Attributes {
  material: string;
  stone: string;
  color: string;
  collection: string;
  occasion: string;
  style: string;
  productType: string;
}

interface ListingOutput {
  title: string;
  description: string;
  metaDescription: string;
  altText: string;
  attributes: Attributes;
}

interface RewriteResponse {
  success: boolean;
  listing?: ListingOutput;
  error?: string;
}

/* ─── Stylika Brand Guidelines (embedded in prompt) ─── */

const STYLIKA_PROMPT = `You are a product copywriter for STYLIKA — an Indian fashion jewelry brand with a 30-year manufacturing legacy, selling on Shopify at www.stylika.com.

WHAT STYLIKA SELLS: Fashion jewellery — plated, coated, alloy-based pieces. NOT precious metals. This is legally and commercially critical.

TARGET AUDIENCE: Urban Indian women, 22–45, who mix ethnic and western wardrobes. They buy jewelry for self-reward, micro-occasions (kitty parties, office events, pre-wedding shoots), and gifting. Instagram-native, style-conscious, prefer variety over "investment pieces."

═══════════════════════════════════════
BRAND VOICE — INTERNALIZE THIS:
═══════════════════════════════════════
Tone: Confident, modern, accessible. Like a stylish friend who knows her jewellery — not a salesperson, not a poet.

DO:
- Write in clear, direct sentences
- Focus on how the piece looks, feels, and what to wear it with
- Use active voice
- Mention versatility (ethnic + western pairing potential)
- Keep it warm but not gushy

DON'T:
- Use flowery/aspirational language ("exquisite radiance," "timeless elegance," "celestial beauty")
- Over-promise ("waterproof," "sterile jewelry," "never fades," "lasts forever")
- Use precious metal terms without qualifiers (see MATERIAL RULES)
- Sound generic or template-y
- Add filler ("This beautiful piece is perfect for those who…")
- Use words like "luxurious," "opulent," "dazzling," "mesmerizing"

═══════════════════════════════════════
MATERIAL LANGUAGE RULES (LEGAL — NON-NEGOTIABLE):
═══════════════════════════════════════
Fashion jewellery is plated/coated — NEVER imply solid precious metals.

NEVER write → ALWAYS write:
- "Gold earrings" → "Gold-tone earrings"
- "Silver ring" → "Silver-tone ring"
- "Gold necklace" → "Gold-plated brass necklace"
- "Rose gold bracelet" → "Rose-gold-tone bracelet"
- "Platinum finish" → "Rhodium-plated finish"
- "Diamond studs" → "CZ Diamond studs"
- "Pearl necklace" → "Faux pearl necklace" or "Pearl necklace" (acceptable)
- "Emerald drops" → "Green stone drops"

Acceptable material descriptions:
- "Material: Brass with gold plating"
- "Material: Alloy with rhodium finish"
- "Material: Brass with rose-gold-tone plating"
- "Stones: Cubic Zirconia (CZ)"
- "Stones: Faux pearls"
- "Stones: Glass crystals"

Rule: If a customer could misunderstand the piece as precious metals or real gemstones, the language is WRONG.

═══════════════════════════════════════
PRODUCT TAXONOMY:
═══════════════════════════════════════
Categories:
- Necklaces: Choker, Pendant, Statement, Lariat, Pendant Set, Charm, Pearl
- Earrings: Hoops, Drops/Danglers, Studs, Huggies, Statement, Clip-on, Pearl, Ear Cuffs
- Rings: Statement, Minimal, Pearl, Diamond (CZ), Stackable
- Wristwear: Kadas, Bracelets, Chain, Cuffs, Tennis, Charm, Statement, Beaded

Collections:
- Minimal: Clean lines, understated, everyday
- Bold: Chunky, oversized, attention-grabbing
- Glam: Sparkle-forward, CZ-heavy, party-ready
- Romance: Soft, feminine, florals, pearls, delicate

Occasions:
- Everyday Wear: Office, casual outings, daily use
- Festive Wear: Diwali, Navratri, Eid, Pongal, Holi
- Office Wear: Subtle, professional, not distracting
- Party Wear: Cocktails, birthdays, night out
- Wedding Wear: Bridal, bridesmaid, mehendi, sangeet

═══════════════════════════════════════
OUTPUT SPECIFICATION — GENERATE ALL OF THESE:
═══════════════════════════════════════

1. TITLE (50-65 characters):
   Format: [Descriptive Name] [Key Detail] | Stylika
   - Front-load the most searchable/descriptive terms
   - Natural language, no pipes mid-title
   - Always end with " | Stylika"
   - No tones/colours in title (e.g. don't put "Gold-Tone" in title)

2. DESCRIPTION (HTML-ready, 100-160 words):
   Paragraph 1 (2-3 sentences): What the piece IS + defining visual feature. Include design inspiration if relevant.
   Paragraph 2 (2-3 sentences): How to WEAR it — versatility, pairing suggestions, occasion fit.
   Bullet List: Product specs.
   
   HTML format:
   <p>First paragraph...</p>
   <p>Second paragraph...</p>
   <ul>
   <li>Material: [Base metal] with [plating type]</li>
   <li>Stones: [Stone types, if any]</li>
   <li>Collection: [Minimal / Bold / Glam / Romance]</li>
   <li>Style: [Western / Ethnic]</li>
   <li>Closure: [type] (if relevant)</li>
   </ul>
   
   Simple pieces: 100-110 words. Complex pieces: up to 160 words.

3. META DESCRIPTION (140-155 characters):
   Action-oriented, includes product type + key differentiator + brand name.
   Natural keyword for SEO. No quotes, no special characters.

4. ALT TEXT (under 125 characters):
   Descriptive, not salesy. Format: [Finish] [product type] with [key visual detail]
   No brand name.

5. ATTRIBUTES (structured):
   - material: e.g. "Brass + Gold Plating"
   - stone: e.g. "CZ" or "Faux Pearls" or "None"
   - color: e.g. "Gold" or "Silver" or "Rose Gold"
   - collection: "Minimal" / "Bold" / "Glam" / "Romance"
   - occasion: e.g. "Everyday, Office"
   - style: "Western" or "Ethnic"
   - productType: e.g. "Earrings > Hoops"

═══════════════════════════════════════
EDGE CASES:
═══════════════════════════════════════
- Simple pieces (studs, thin bands): Skip cultural language, focus on versatility, 100-110 words
- Complex pieces (statement necklaces): Include design reference, more pairing suggestions, up to 160 words
- Sets: Mention "Set" in title, note what's included
- If you cannot determine an attribute from the image, use "[TBD]"

═══════════════════════════════════════
QUALITY CHECKLIST (your output MUST pass ALL):
═══════════════════════════════════════
✓ No "gold"/"silver"/"diamond"/"pearl" without proper qualifiers
✓ Title is 50-65 chars, ends with " | Stylika"
✓ Meta description is 140-155 chars
✓ Description is 100-160 words
✓ Alt text under 125 chars
✓ No flowery/aspirational language
✓ No over-promises
✓ Category + Collection + Occasion assigned
✓ HTML is clean (<p>, <ul><li>, no inline styles, no <h1>/<h2>)
✓ Material info consistent between description bullets and attributes
✓ No conversational fluff or "Would you like…" endings`;

const OUTPUT_JSON_SCHEMA = `{
  "title": "Product title 50-65 chars ending with | Stylika",
  "description": "<p>Paragraph 1...</p><p>Paragraph 2...</p><ul><li>Material: ...</li><li>Stones: ...</li><li>Collection: ...</li><li>Style: ...</li></ul>",
  "metaDescription": "140-155 char meta description with brand name",
  "altText": "Under 125 char descriptive alt text without brand name",
  "attributes": {
    "material": "Base metal + plating",
    "stone": "Stone type or None",
    "color": "Finish color",
    "collection": "Minimal / Bold / Glam / Romance",
    "occasion": "Occasion1, Occasion2",
    "style": "Western or Ethnic",
    "productType": "Category > Subcategory"
  }
}`;

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

    if (isAutoGenerate) {
      prompt = `${STYLIKA_PROMPT}

TASK: Analyze the product image and generate a COMPLETE Shopify-ready listing following ALL guidelines above.

JEWELRY TYPE (user-selected): ${jewelryType || "jewelry"}
${rawTitle?.trim() ? `SELLER'S TITLE HINT: "${rawTitle.trim()}"` : ""}
${rawDescription?.trim() ? `SELLER'S NOTES: "${rawDescription.trim()}"` : ""}

Look at the image carefully. Identify the metal finish, stones, design style, closure type, and complexity. Then generate the full listing.

OUTPUT FORMAT (strict JSON, nothing else):
${OUTPUT_JSON_SCHEMA}`;
    } else if (isRefine) {
      prompt = `${STYLIKA_PROMPT}

TASK: The seller has reviewed and possibly edited their listing. Refine it further — improve clarity, ensure compliance with ALL Stylika guidelines above, and make it more compelling. Respect the seller's edits and intent.

CURRENT TITLE: "${rawTitle || ""}"
CURRENT DESCRIPTION: "${rawDescription || ""}"
JEWELRY TYPE: ${jewelryType || "jewelry"}

Ensure the output passes the Quality Checklist. Fix any material language violations. Ensure title ends with " | Stylika" and is 50-65 chars.

OUTPUT FORMAT (strict JSON, nothing else):
${OUTPUT_JSON_SCHEMA}`;
    } else {
      prompt = `${STYLIKA_PROMPT}

TASK: Rewrite the seller's raw input into a polished, Stylika-compliant Shopify listing following ALL guidelines above.

RAW TITLE: "${rawTitle || ""}"
RAW DESCRIPTION: "${rawDescription || ""}"
JEWELRY TYPE: ${jewelryType || "jewelry"}
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

      const listing: ListingOutput = {
        title: parsed.title || "",
        description: parsed.description || "",
        metaDescription: parsed.metaDescription || "",
        altText: parsed.altText || "",
        attributes: {
          material: parsed.attributes?.material || "[TBD]",
          stone: parsed.attributes?.stone || "[TBD]",
          color: parsed.attributes?.color || "[TBD]",
          collection: parsed.attributes?.collection || "[TBD]",
          occasion: parsed.attributes?.occasion || "[TBD]",
          style: parsed.attributes?.style || "[TBD]",
          productType: parsed.attributes?.productType || "[TBD]",
        },
      };

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
