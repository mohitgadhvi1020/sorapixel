import type { Metadata } from "next";
import HomePageClient from "./HomePageClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "SoraiPixel — AI Product Photography | Studio-Quality Images in Seconds",
  description:
    "AI photography platform that transforms any product photo into studio-quality images. Hero shots, close-ups, model photos, lifestyle scenes, and videos — no studio needed. Try free.",
  keywords: [
    "AI photography",
    "AI product photography",
    "product photo generator",
    "e-commerce product photography",
    "AI photo enhancement",
    "studio quality product images",
    "AI photo generator",
    "product catalogue photography",
    "product photography AI tool",
    "AI image generator for products",
    "UGC content creator",
    "AI video generator",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "SoraiPixel — AI Product Photography",
    description:
      "Transform any product photo into studio-quality images in seconds. AI-powered photography for e-commerce sellers.",
    url: SITE_URL,
    siteName: "SoraiPixel",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: `${SITE_URL}/images/og-hero.png`,
        width: 1376,
        height: 768,
        alt: "SoraiPixel AI Product Photography",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SoraiPixel — AI Product Photography",
    description:
      "Transform any product photo into studio-quality images in seconds.",
    images: [`${SITE_URL}/images/og-hero.png`],
  },
};

export default function HomePage() {
  return <HomePageClient />;
}
