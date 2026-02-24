import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: "Pricing — AI Jewelry Photography Plans",
  description:
    "Simple, transparent pricing for AI jewelry photography. Start free with 5 daily tokens. Upgrade for studio-quality hero shots, model photos, and bulk listings.",
  keywords: [
    "AI jewelry photography pricing",
    "product photography pricing",
    "jewelry photo editing cost",
    "AI photo plans",
  ],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Pricing — SoraiPixel AI Jewelry Photography",
    description:
      "Simple, transparent pricing for AI jewelry photography. Start free, upgrade when ready.",
    url: `${SITE_URL}/pricing`,
    siteName: "SoraiPixel",
    type: "website",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
