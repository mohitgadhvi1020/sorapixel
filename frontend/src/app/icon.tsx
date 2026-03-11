import { ImageResponse } from "next/og";

export const size = {
  width: 64,
  height: 64,
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 30% 30%, #2a241d 0%, #17130f 55%, #0d0b09 100%)",
          borderRadius: "14px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 20%, rgba(255,255,255,0.14), transparent 35%)",
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 42,
            height: 42,
            borderRadius: "9999px",
            background:
              "linear-gradient(135deg, rgba(196,166,125,0.22), rgba(139,115,85,0.12))",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              lineHeight: 1,
              color: "#c4a67d",
              fontFamily: "Arial, sans-serif",
              textShadow: "0 0 14px rgba(196,166,125,0.25)",
              transform: "translateY(-1px)",
            }}
          >
            i
          </span>
        </div>
      </div>
    ),
    size,
  );
}
