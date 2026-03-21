import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ReachWise — AI Outbound Research Copilot for Agencies",
  description:
    "Turn your website and assets into researched, personalized outbound campaigns. AI-powered prospect research and email drafting for agencies and B2B service firms.",
  keywords: ["outbound", "AI research", "cold email", "personalization", "agencies", "B2B"],
  authors: [{ name: "ReachWise" }],
  openGraph: {
    title: "ReachWise — Smarter Outbound for Service Businesses",
    description:
      "Turn your website and assets into researched, personalized outbound campaigns.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
