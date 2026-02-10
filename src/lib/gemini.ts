import { GoogleGenAI } from "@google/genai";

let _ai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Get one at https://aistudio.google.com/apikey"
      );
    }
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

/**
 * Retry wrapper with exponential backoff.
 * Retries on rate-limit (429) and transient server errors (500-503).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2,
  baseDelayMs: number = 3000
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      const isRetryable =
        msg.includes("429") ||
        msg.includes("quota") ||
        msg.includes("resource_exhausted") ||
        msg.includes("500") ||
        msg.includes("503") ||
        msg.includes("overloaded") ||
        msg.includes("unavailable");

      if (!isRetryable || attempt === maxRetries) {
        throw lastError;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.log(
        `Gemini call failed (${lastError.message}). Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

/**
 * Takes a raw product image and generates a studio-quality version
 * using Gemini Nano Banana (gemini-2.5-flash-image).
 *
 * Single API call — no mask, no pipeline, just works.
 */
export async function generateStudioImage(
  imageBase64: string,
  mimeType: string,
  prompt: string
): Promise<{ resultBase64: string; resultMimeType: string; text?: string }> {
  const ai = getClient();

  // Strip data URI prefix if present
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          text: prompt,
        },
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
      ],
      config: {
        responseModalities: ["IMAGE"],
      },
    })
  );

  // Extract image and text from response
  let resultBase64 = "";
  let resultMimeType = "image/png";
  let text: string | undefined;

  const parts = response.candidates?.[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error(
      "Gemini returned no content. The image may have been blocked by safety filters. Try a different image or style."
    );
  }

  for (const part of parts) {
    if (part.text) {
      text = part.text;
    } else if (part.inlineData) {
      resultBase64 = part.inlineData.data!;
      resultMimeType = part.inlineData.mimeType || "image/png";
    }
  }

  if (!resultBase64) {
    throw new Error(
      "Gemini did not return an image. Response: " + (text || "empty")
    );
  }

  return { resultBase64, resultMimeType, text };
}

/**
 * Takes a raw/casual user prompt and refines it into a detailed
 * product photography scene description using Gemini (text-only).
 *
 * Also determines whether the product should be isolated from its
 * context (hands, body, background) or kept in a human/lifestyle context.
 */
export async function refinePrompt(
  rawPrompt: string
): Promise<{ refined: string; isolate: boolean }> {
  const ai = getClient();

  const response = await withRetry(() =>
    ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          text: `You are a world-class product photography director. A user has described what they want in casual language. You must do TWO things:

1. Convert their request into a detailed, professional product photography scene description.
2. Decide whether the product should be ISOLATED (extracted from hands/body/context) or kept in a HUMAN/LIFESTYLE context.

USER REQUEST: "${rawPrompt}"

INTENT ANALYSIS:
- If the user wants the product ON a surface, in a studio, with specific lighting, or in an environment WITHOUT people → ISOLATE = true
- If the user wants the product held by a person, worn by someone, in someone's hand, on a body, or in any human-interaction context → ISOLATE = false

OUTPUT FORMAT (strict JSON, nothing else):
{"scene": "your 2-4 sentence scene description here", "isolate": true}

RULES FOR THE SCENE DESCRIPTION:
- 2-4 sentences max
- Describe: surface/background, lighting, mood/atmosphere, camera angle
- Keep it realistic and achievable
- If isolate=false, describe the human context too (e.g. "held in a child's hand", "worn on a wrist")
- Do NOT include any preamble or explanation — output ONLY the JSON object

EXAMPLE 1:
Input: "make it look premium and expensive"
Output: {"scene": "Place on a deep black matte surface with warm golden rim lighting from behind. Soft overhead spotlight creates a dramatic pool of light on the product. The background fades to pure black with subtle warm bokeh. Luxury editorial photography style with high contrast and rich shadows.", "isolate": true}

EXAMPLE 2:
Input: "put this in a child's hand"
Output: {"scene": "A small child's hand gently holding the product, photographed at eye level with soft natural window light. Warm, playful atmosphere with a pastel-toned blurred background. The focus is sharp on the product and the child's hand, with a shallow depth of field creating a dreamy lifestyle feel.", "isolate": false}`,
        },
      ],
    })
  );

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Failed to refine prompt — no response from AI");
  }

  // Parse the JSON response
  try {
    const cleaned = text
      .trim()
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    return {
      refined: parsed.scene || parsed.refined || cleaned,
      isolate: parsed.isolate !== false,
    };
  } catch {
    // Fallback: treat entire response as scene description, default isolate
    return { refined: text.trim(), isolate: true };
  }
}
