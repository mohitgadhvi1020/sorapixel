"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { trackEvent } from "@/lib/gtag";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
    trackEvent("exception", { description: error.message, fatal: true, digest: error.digest, where: "app.error-boundary" });
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
        Something went wrong
      </h2>
      <p style={{ color: "#666", marginBottom: "1.5rem", maxWidth: "24rem" }}>
        An unexpected error occurred. Our team has been notified.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.625rem 1.5rem",
          borderRadius: "0.5rem",
          border: "none",
          background: "#111",
          color: "#fff",
          cursor: "pointer",
          fontSize: "0.875rem",
        }}
      >
        Try again
      </button>
    </div>
  );
}
