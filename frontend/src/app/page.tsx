import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "SoraiPixel — AI Photography for Jewelry | Studio-Quality Product Images in Seconds",
  description:
    "AI photography platform that transforms raw jewelry photos into studio-quality product images. Hero shots, close-ups, model photos, and lifestyle scenes — no studio needed. Try free.",
  keywords: [
    "AI photography",
    "AI jewelry photography",
    "AI product photography",
    "jewelry product photography",
    "AI photo generator",
    "jewelry photo editing AI",
    "studio quality jewelry images",
    "e-commerce jewelry photos",
    "AI photo enhancement",
    "jewelry catalogue photography",
    "product photography AI tool",
    "AI image generator for products",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "SoraiPixel — AI Jewelry Photography",
    description:
      "Transform raw jewelry photos into studio-quality images in seconds. AI-powered product photography for jewelers.",
    url: SITE_URL,
    siteName: "SoraiPixel",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${SITE_URL}/images/hero-jewelry.png`,
        width: 1376,
        height: 768,
        alt: "SoraiPixel AI Jewelry Photography",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SoraiPixel — AI Jewelry Photography",
    description:
      "Transform raw jewelry photos into studio-quality images in seconds.",
    images: [`${SITE_URL}/images/hero-jewelry.png`],
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
