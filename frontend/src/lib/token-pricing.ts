/**
 * Centralized token pricing — must match backend/app/services/credit_service.py
 */

export const JEWELRY_PRICING = {
  standard: {
    imageGen: 8,
    regenSingle: 8,
    recolorSingle: 7,
    listing: 5,
    ugcPerPose: 8,
  },
  pro: {
    imageGen: 20,
    regenSingle: 20,
    recolorSingle: 18,
    listing: 5,
    ugcPerPose: 20,
  },
  ultra: {
    imageGen: 60,
    regenSingle: 60,
    recolorSingle: 55,
    listing: 5,
    ugcPerPose: 60,
  },
} as const;

export const STUDIO_PRICING = {
  standard: 5,
  pro: 20,
  ultra: 60,
} as const;

export const VIDEO_PRICING = {
  standard: 25,
  pro: 50,
} as const;

export const FLOW_VIDEO_PRICING = {
  standard: 40,
  pro: 80,
} as const;

export const LISTING_PRICING = {
  costPerImage: 5,
  costPerRegen: 3,
} as const;

export const DAILY_REWARD_TOKENS = 8;
export const FREE_FIRST_GENERATION = 1;

export type Quality = "standard" | "pro" | "ultra";

export function getJewelryCost(operation: keyof typeof JEWELRY_PRICING.standard, quality: Quality = "standard"): number {
  return JEWELRY_PRICING[quality][operation];
}

export function getStudioCost(quality: Quality = "standard"): number {
  return STUDIO_PRICING[quality];
}

export const TOKEN_COSTS_TABLE = [
  { feature: "First Generation", standard: "FREE (1x)", pro: "FREE (1x)" },
  { feature: "Jewelry Photo (per image)", standard: `${JEWELRY_PRICING.standard.imageGen} tokens`, pro: `${JEWELRY_PRICING.pro.imageGen} tokens` },
  { feature: "Regenerate Shot", standard: `${JEWELRY_PRICING.standard.regenSingle} tokens`, pro: `${JEWELRY_PRICING.pro.regenSingle} tokens` },
  { feature: "UGC Model Photo (per pose)", standard: `${JEWELRY_PRICING.standard.ugcPerPose} tokens`, pro: `${JEWELRY_PRICING.pro.ugcPerPose} tokens` },
  { feature: "Recolor Metal", standard: `${JEWELRY_PRICING.standard.recolorSingle} tokens`, pro: `${JEWELRY_PRICING.pro.recolorSingle} tokens` },
  { feature: "Product Listing (AI)", standard: `${JEWELRY_PRICING.standard.listing} tokens`, pro: `${JEWELRY_PRICING.pro.listing} tokens` },
  { feature: "Branding Strip", standard: "FREE", pro: "FREE" },
  { feature: "Studio Shot", standard: `${STUDIO_PRICING.standard} token`, pro: `${STUDIO_PRICING.pro} tokens` },
  { feature: "Video Generation", standard: `${VIDEO_PRICING.standard} tokens`, pro: `${VIDEO_PRICING.pro} tokens` },
  { feature: "Flow Video", standard: `${FLOW_VIDEO_PRICING.standard} tokens`, pro: `${FLOW_VIDEO_PRICING.pro} tokens` },
];
