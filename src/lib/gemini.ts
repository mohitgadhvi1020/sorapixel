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

  const response = await ai.models.generateContent({
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
      responseModalities: ["TEXT", "IMAGE"],
    },
  });

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
 */
export async function refinePrompt(rawPrompt: string): Promise<string> {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        text: `You are a world-class product photography director. A user has described what they want in casual language. Convert their request into a detailed, professional product photography scene description.

USER REQUEST: "${rawPrompt}"

RULES:
- Output ONLY the scene description (2-4 sentences max)
- Describe: surface/background, lighting type & direction, mood/atmosphere, camera angle
- Keep it realistic and achievable for product photography
- Do NOT mention the product itself — focus only on the scene/environment
- Do NOT include any preamble, explanation, or formatting — just the raw scene description

EXAMPLE INPUT: "make it look premium and expensive"
EXAMPLE OUTPUT: "Place on a deep black matte surface with warm golden rim lighting from behind. Soft overhead spotlight creates a dramatic pool of light on the product. The background fades to pure black with subtle warm bokeh. Luxury editorial photography style with high contrast and rich shadows."`,
      },
    ],
  });

  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Failed to refine prompt — no response from AI");
  }

  return text.trim();
}
