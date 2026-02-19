import { NextRequest, NextResponse } from "next/server";
import { getClientId, trackGeneration, trackImage, uploadImage } from "@/lib/track-usage";
import { getJewelryCredits, deductJewelryTokens, JEWELRY_PRICING } from "@/lib/jewelry-credits";
import { upscaleImage, UPSCALE_COST_USD } from "@/lib/fal";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const clientId = await getClientId();
  if (!clientId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { imageBase64, label } = await req.json();
  if (!imageBase64) {
    return NextResponse.json({ error: "No image provided" }, { status: 400 });
  }

  const credits = await getJewelryCredits(clientId);
  const hdCost = JEWELRY_PRICING.hdUpscale;
  if (!credits || credits.tokenBalance < hdCost) {
    return NextResponse.json(
      { error: `Insufficient tokens. HD costs ${hdCost} tokens, you have ${credits?.tokenBalance ?? 0}.` },
      { status: 403 }
    );
  }

  const deducted = await deductJewelryTokens(clientId, hdCost);
  if (!deducted) {
    return NextResponse.json({ error: "Failed to deduct tokens" }, { status: 500 });
  }

  try {
    console.log(`On-demand HD for "${label}" via Flux Dev img2img...`);
    const hd = await upscaleImage(imageBase64);
    console.log(`HD complete: ${label} → ${hd.width}×${hd.height}`);

    // Store HD image (non-blocking)
    (async () => {
      try {
        const genId = await trackGeneration({
          clientId,
          generationType: "hd_upscale",
          model: "flux-dev-img2img",
          metadata: {
            sourceLabel: label,
            width: hd.width,
            height: hd.height,
            costUsd: UPSCALE_COST_USD,
          },
        });

        const uploaded = await uploadImage(clientId, hd.base64, `${label} HD`);
        if (uploaded) {
          await trackImage({
            generationId: genId,
            clientId,
            label: `${label} HD`,
            storagePath: uploaded.path,
            fileSizeBytes: uploaded.size,
          });
        }
      } catch (err) {
        console.error("HD tracking error (non-fatal):", err);
      }
    })();

    return NextResponse.json({
      success: true,
      hdWidth: hd.width,
      hdHeight: hd.height,
      tokensUsed: hdCost,
    });
  } catch (err) {
    console.error("HD generation failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "HD generation failed" },
      { status: 500 }
    );
  }
}
