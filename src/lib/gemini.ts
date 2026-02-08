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
