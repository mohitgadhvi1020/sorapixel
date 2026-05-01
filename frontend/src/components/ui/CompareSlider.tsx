"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface CompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  /** w/h ratio, e.g. 1/1, 3/4, 16/9. Defaults to 1/1 (square). */
  aspectRatio?: string;
  /** Use contain when before/after images have different framing or orientation. */
  imageFit?: "cover" | "contain";
}

export default function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "AI Generated",
  className = "",
  aspectRatio = "1/1",
  imageFit = "cover",
}: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.max(2, Math.min(98, (x / rect.width) * 100));
    setPosition(pct);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      updatePosition(e.clientX);
    },
    [isDragging, updatePosition],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setPosition((prev) => Math.max(2, prev - 5));
    }
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setPosition((prev) => Math.min(98, prev + 5));
    }
    if (e.key === "Home") {
      e.preventDefault();
      setPosition(2);
    }
    if (e.key === "End") {
      e.preventDefault();
      setPosition(98);
    }
  }, []);

  useEffect(() => {
    if (!isDragging) return;
    const up = () => setIsDragging(false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-2xl bg-[#f7f3eb] cursor-col-resize shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c4a67d] ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onKeyDown={handleKeyDown}
      role="slider"
      tabIndex={0}
      aria-label="Before and after comparison"
      aria-valuemin={2}
      aria-valuemax={98}
      aria-valuenow={Math.round(position)}
      style={{ aspectRatio, touchAction: "none" }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(0,0,0,0.025)_25%,transparent_25%,transparent_75%,rgba(0,0,0,0.025)_75%),linear-gradient(45deg,rgba(0,0,0,0.025)_25%,transparent_25%,transparent_75%,rgba(0,0,0,0.025)_75%)] bg-[length:28px_28px] bg-[position:0_0,14px_14px]" />

      {/* After image */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 block h-full w-full"
        style={{ objectFit: imageFit }}
        draggable={false}
      />

      {/* Before image — absolute, full-size, clipped via clip-path */}
      <div
        className="absolute inset-0"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="block w-full h-full"
          style={{ objectFit: imageFit }}
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-[3px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.18),0_0_18px_rgba(0,0,0,0.35)]"
        style={{ left: `${position}%`, transform: "translateX(-50%)" }}
      >
        {/* Drag handle */}
        <div className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/95 shadow-[0_8px_28px_rgba(0,0,0,0.28)] backdrop-blur-sm">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 4L2 9L6 14" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 4L16 9L12 14" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div
        className="pointer-events-none absolute left-3 top-3 max-w-[42%] truncate rounded-full bg-black/68 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white/85 shadow-sm backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: position > 12 ? 1 : 0 }}
      >
        {beforeLabel}
      </div>
      <div
        className="pointer-events-none absolute right-3 top-3 max-w-[42%] truncate rounded-full bg-[#c4a67d]/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: position < 88 ? 1 : 0 }}
      >
        {afterLabel}
      </div>
    </div>
  );
}
