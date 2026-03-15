"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface CompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  aspectRatio?: string;
}

export default function CompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Original",
  afterLabel = "AI Generated",
  className = "",
  aspectRatio = "1/1",
}: CompareSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [ready, setReady] = useState(false);
  const loadedRef = useRef({ before: false, after: false });

  const markLoaded = useCallback((which: "before" | "after") => {
    loadedRef.current[which] = true;
    if (loadedRef.current.before && loadedRef.current.after) setReady(true);
  }, []);

  useEffect(() => {
    loadedRef.current = { before: false, after: false };
    setReady(false);
  }, [beforeSrc, afterSrc]);

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

  useEffect(() => {
    if (!isDragging) return;
    const up = () => setIsDragging(false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [isDragging]);

  return (
    <div
      ref={containerRef}
      className={`relative select-none overflow-hidden rounded-2xl cursor-col-resize ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: "none", aspectRatio }}
    >
      {/* Both images stacked absolutely so neither can flash alone */}
      <img
        src={afterSrc}
        alt={afterLabel}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: ready ? 1 : 0 }}
        decoding="sync"
        draggable={false}
        onLoad={() => markLoaded("after")}
      />

      <div
        className="absolute inset-0"
        style={{
          clipPath: `inset(0 ${100 - position}% 0 0)`,
          opacity: ready ? 1 : 0,
        }}
      >
        <img
          src={beforeSrc}
          alt={beforeLabel}
          className="w-full h-full object-cover"
          decoding="sync"
          draggable={false}
          onLoad={() => markLoaded("before")}
        />
      </div>

      {/* Placeholder while loading */}
      {!ready && (
        <div className="absolute inset-0 bg-[#e8e5df] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#c4a67d] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_6px_rgba(0,0,0,0.6)] transition-opacity duration-200"
        style={{ left: `${position}%`, transform: "translateX(-50%)", opacity: ready ? 1 : 0 }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 backdrop-blur-sm shadow-lg flex items-center justify-center border border-white/40">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 4L2 9L6 14" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 4L16 9L12 14" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Labels */}
      <div
        className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-white/80 pointer-events-none transition-opacity duration-200"
        style={{ opacity: ready && position > 12 ? 1 : 0 }}
      >
        {beforeLabel}
      </div>
      <div
        className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-[rgba(196,166,125,0.7)] backdrop-blur-sm text-[10px] font-bold uppercase tracking-wider text-white pointer-events-none transition-opacity duration-200"
        style={{ opacity: ready && position < 88 ? 1 : 0 }}
      >
        {afterLabel}
      </div>
    </div>
  );
}
