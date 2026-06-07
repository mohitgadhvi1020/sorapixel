import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found — SoraiPixel",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <Link
        href="/"
        style={{ fontWeight: 700, fontSize: "1.1rem", letterSpacing: "0.2px", marginBottom: "2rem", color: "inherit", textDecoration: "none" }}
      >
        sora<span style={{ color: "#c4a67d" }}>i</span>pixel
      </Link>

      <div style={{ fontSize: "3.5rem", fontWeight: 800, lineHeight: 1, color: "#c4a67d", marginBottom: "0.75rem" }}>
        404
      </div>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>
        This page doesn&apos;t exist
      </h1>
      <p style={{ color: "#888", marginBottom: "2rem", maxWidth: "26rem" }}>
        The page you&apos;re looking for may have moved or never existed. Let&apos;s get you back to making beautiful jewelry photos.
      </p>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/create"
          style={{
            padding: "0.7rem 1.6rem",
            borderRadius: "0.65rem",
            background: "#c4a67d",
            color: "#1a1206",
            fontWeight: 600,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          Start Creating
        </Link>
        <Link
          href="/"
          style={{
            padding: "0.7rem 1.6rem",
            borderRadius: "0.65rem",
            border: "1px solid rgba(150,150,150,0.35)",
            color: "inherit",
            fontWeight: 600,
            fontSize: "0.9rem",
            textDecoration: "none",
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
