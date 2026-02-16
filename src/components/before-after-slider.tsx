"use client";

import { useState, useRef, useCallback } from "react";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  /** e.g. "4 / 5" or "9 / 16". Defaults to "1 / 1" */
  ratio?: string;
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "Studio",
  ratio = "1 / 1",
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition]
  );

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden select-none bg-white shadow-lg touch-none"
      style={{ aspectRatio: ratio }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* After image */}
      <img src={afterSrc} alt="After" className="absolute inset-0 w-full h-full object-contain" draggable={false} />

      {/* Before image (clipped) — white bg so transparency doesn't bleed through */}
      <div
        className="absolute inset-0 bg-white"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeSrc}
          alt="Before"
          className="w-full h-full object-contain"
          draggable={false}
        />
      </div>

      {/* Slider line + handle */}
      <div
        className="absolute top-0 bottom-0 z-10 cursor-col-resize"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)", width: "48px" }}
        onPointerDown={handlePointerDown}
      >
        <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-white/80 shadow-[0_0_8px_rgba(0,0,0,0.3)]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-full shadow-lg flex items-center justify-center active:scale-95">
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7l-4 5 4 5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7l4 5-4 5" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      {sliderPosition > 10 && (
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 glass text-[#1b1b1f] text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg z-20 pointer-events-none border border-white/20">
          {beforeLabel}
        </div>
      )}
      {sliderPosition < 90 && (
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 glass text-[#1b1b1f] text-[10px] sm:text-xs font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg z-20 pointer-events-none border border-white/20">
          {afterLabel}
        </div>
      )}
    </div>
  );
}
