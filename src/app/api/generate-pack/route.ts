import { NextRequest, NextResponse } from "next/server";
import { generateStudioImage, TokenUsage } from "@/lib/gemini";
import { getStyleById, buildPackPrompts, buildCustomPrompt } from "@/lib/styles";
import { compositeLogoOnImage } from "@/lib/logo-overlay-server";
import { getRatioById, DEFAULT_RATIO } from "@/lib/aspect-ratios";
import { cropToRatio } from "@/lib/crop-to-ratio";
import { addWatermark } from "@/lib/watermark";
import { getClientId, trackGeneration, trackImage, uploadImage } from "@/lib/track-usage";
import { getStudioCredits, deductStudioCredits } from "@/lib/studio-credits";

export const maxDuration = 120;

interface PackImage {
  label: string;
  base64: string;
  watermarkedBase64: string;
  mimeType: string;
  text?: string;
  tokenUsage?: TokenUsage;
}

interface GeneratePackResponse {
  success: boolean;
  images?: PackImage[];
  error?: string;
}

export async function POST(
  req: NextRequest
): Promise<NextResponse<GeneratePackResponse>> {
  try {
    const body = await req.json();
    const { imageBase64, styleId, customPrompt, logoBase64, aspectRatioId } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    if (!styleId && !customPrompt) {
      return NextResponse.json(
        { success: false, error: "No style or custom prompt provided" },
        { status: 400 }
      );
    }

    // Check studio credits
    const clientId = await getClientId();
    if (clientId) {
      const credits = await getStudioCredits(clientId);
      if (credits && !credits.canGenerate) {
        return NextResponse.json(
          {
            success: false,
            error: "You've used all your free generations. Please purchase tokens to continue.",
            code: "CREDITS_EXHAUSTED",
          } as GeneratePackResponse & { code?: string },
          { status: 403 }
        );
      }
    }

    // Resolve aspect ratio
    const ratio = getRatioById(aspectRatioId) || DEFAULT_RATIO;

    // Resolve the base prompt — either from a preset or custom
    let basePrompt: string;
    let styleName: string;

    if (customPrompt) {
      basePrompt = buildCustomPrompt(customPrompt);
      styleName = "Custom Prompt";
    } else {
      const style = getStyleById(styleId);
      if (!style) {
        return NextResponse.json(
          { success: false, error: "Invalid style selected" },
          { status: 400 }
        );
      }
      basePrompt = style.prompt;
      styleName = style.name;
    }

    // Append composition hint for aspect ratio
    const ratioPrompt = `${basePrompt}\n\nCOMPOSITION: ${ratio.compositionHint}`;

    // Detect mime type from base64 data URI
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : "image/png";

    // Build 3 prompts
    const prompts = buildPackPrompts(ratioPrompt);

    console.log("Generating Marketplace Pack with Gemini...");
    console.log("Style:", styleName, "| Ratio:", ratio.label);

    // Fire all 3 in parallel
    const [heroResult, angleResult, closeupResult] = await Promise.all([
      generateStudioImage(imageBase64, mimeType, prompts.hero).catch((e) => ({
        resultBase64: "",
        resultMimeType: "image/png",
        text: `Hero failed: ${e.message}`,
        error: true as const,
      })),
      generateStudioImage(imageBase64, mimeType, prompts.angle).catch((e) => ({
        resultBase64: "",
        resultMimeType: "image/png",
        text: `Angle failed: ${e.message}`,
        error: true as const,
      })),
      generateStudioImage(imageBase64, mimeType, prompts.closeup).catch(
        (e) => ({
          resultBase64: "",
          resultMimeType: "image/png",
          text: `Closeup failed: ${e.message}`,
          error: true as const,
        })
      ),
    ]);

    const images: PackImage[] = [];

    if (heroResult.resultBase64) {
      images.push({
        label: "Hero Shot",
        base64: heroResult.resultBase64,
        watermarkedBase64: "",
        mimeType: heroResult.resultMimeType,
        text: heroResult.text,
        tokenUsage: "tokenUsage" in heroResult ? heroResult.tokenUsage : undefined,
      });
    }

    if (angleResult.resultBase64) {
      images.push({
        label: "Alternate Angle",
        base64: angleResult.resultBase64,
        watermarkedBase64: "",
        mimeType: angleResult.resultMimeType,
        text: angleResult.text,
        tokenUsage: "tokenUsage" in angleResult ? angleResult.tokenUsage : undefined,
      });
    }

    if (closeupResult.resultBase64) {
      images.push({
        label: "Close-up Detail",
        base64: closeupResult.resultBase64,
        watermarkedBase64: "",
        mimeType: closeupResult.resultMimeType,
        text: closeupResult.text,
        tokenUsage: "tokenUsage" in closeupResult ? closeupResult.tokenUsage : undefined,
      });
    }

    if (images.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "All 3 generations failed. Please try again.",
        },
        { status: 500 }
      );
    }

    // Crop to exact aspect ratio (+ circular mask if needed)
    console.log(`Cropping to ${ratio.width}x${ratio.height}${ratio.circular ? " (circular)" : ""}...`);
    for (let i = 0; i < images.length; i++) {
      try {
        images[i].base64 = await cropToRatio(
          images[i].base64,
          ratio.width,
          ratio.height,
          !!ratio.circular
        );
        images[i].mimeType = "image/png";
      } catch (err) {
        console.error(`Crop failed for image ${i}:`, err);
      }
    }

    // Apply logo overlay if provided (after crop so logo is in final frame)
    if (logoBase64) {
      const rawLogo = logoBase64.replace(/^data:image\/\w+;base64,/, "");
      console.log("Applying brand logo overlay with Sharp...");
      for (let i = 0; i < images.length; i++) {
        try {
          images[i].base64 = await compositeLogoOnImage(
            images[i].base64,
            rawLogo
          );
          images[i].mimeType = "image/png";
        } catch (err) {
          console.error(`Logo overlay failed for image ${i}:`, err);
        }
      }
    }

    // Add watermarks for preview
    console.log("Adding watermarks for preview...");
    for (let i = 0; i < images.length; i++) {
      try {
        images[i].watermarkedBase64 = await addWatermark(images[i].base64);
      } catch (err) {
        console.error(`Watermark failed for image ${i}:`, err);
        images[i].watermarkedBase64 = images[i].base64;
      }
    }

    console.log(`Pack complete! ${images.length}/3 images generated.`);

    // Deduct studio credits
    if (clientId) {
      await deductStudioCredits(clientId, images.length);
    }

    // ── Track usage & store images (non-blocking) ──
    if (clientId) {
      (async () => {
        try {
          for (const img of images) {
            const genId = await trackGeneration({
              clientId,
              generationType: `studio-${img.label.toLowerCase().replace(/\s+/g, "-")}`,
              tokenUsage: img.tokenUsage,
              model: "gemini-2.5-flash-image",
            });

            const uploaded = await uploadImage(clientId, img.base64, img.label);
            if (uploaded) {
              await trackImage({
                generationId: genId,
                clientId,
                label: img.label,
                storagePath: uploaded.path,
                fileSizeBytes: uploaded.size,
              });
            }
          }
        } catch (err) {
          console.error("Studio pack tracking error:", err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error("Pack generation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
