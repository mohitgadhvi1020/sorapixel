import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://soraipixel.com";

export const metadata: Metadata = {
  title: {
    default: "SoraiPixel — AI Jewelry Photography",
    template: "%s | SoraiPixel",
  },
  description:
    "AI photography platform for jewelry. Transform raw product photos into studio-quality images in seconds. AI jewelry photography with hero shots, model photos, lifestyle scenes. Try free.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "SoraiPixel — AI Photography for Jewelry",
    description:
      "AI photography that transforms raw jewelry photos into studio-quality images. Hero shots, model photos, lifestyle scenes — all from one upload.",
    url: SITE_URL,
    siteName: "SoraiPixel",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "SoraiPixel — AI Photography for Jewelry",
    description:
      "AI photography platform. Transform any jewelry photo into studio-quality images in seconds.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "SoraiPixel",
  url: SITE_URL,
  description: "AI photography platform for jewelry and product images. Studio-quality hero shots, model photos, and lifestyle scenes from any photo, in seconds.",
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "SoraiPixel",
  url: SITE_URL,
};

const softwareAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SoraiPixel",
  applicationCategory: "PhotographyApplication",
  operatingSystem: "Web",
  url: SITE_URL,
  description:
    "AI photography platform for jewelry and products. Transform raw photos into studio-quality images with hero shots, close-ups, model photos, and lifestyle scenes.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "INR",
    description: "Free tier with daily tokens. Paid plans for professional use.",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "120",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${playfair.variable} ${jetBrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
