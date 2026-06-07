"use client";

import { useRef, useState } from "react";

interface UploadDropzoneProps {
  /** Called with the chosen file once it passes the size check. */
  onFile: (file: File) => void;
  /** Surface a validation error (e.g. file too large) in the host flow's UI. */
  onError?: (message: string) => void;
  title?: string;
  hint?: string;
  accept?: string;
  maxSizeMB?: number;
  /** Show a "Take Photo" camera capture button (mobile). */
  showCamera?: boolean;
  /** Light-theme styling for surfaces that aren't dark. */
  light?: boolean;
  className?: string;
}

/**
 * Shared upload dropzone used across every creation flow (Jewelry, Studio,
 * Model Shots, Video) so the upload experience is identical everywhere.
 * Presentational + input handling only — each flow owns what happens to the file.
 */
export default function UploadDropzone({
  onFile,
  onError,
  title = "Upload an image",
  hint = "PNG, JPG, WebP — up to 10MB",
  accept = "image/*",
  maxSizeMB = 10,
  showCamera = false,
  light = false,
  className = "",
}: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function accept_(file?: File | null) {
    if (!file) return;
    if (file.size > maxSizeMB * 1024 * 1024) {
      onError?.(`File too large. Max ${maxSizeMB}MB.`);
      return;
    }
    onFile(file);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setDragging(false); }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); accept_(e.dataTransfer.files?.[0]); }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
      className={`block p-12 md:p-16 text-center cursor-pointer rounded-[20px] border-2 border-dashed transition-all duration-300 group ${
        dragging
          ? "border-[#c4a67d] bg-[rgba(196,166,125,0.06)]"
          : "border-[rgba(196,166,125,0.25)] hover:border-[rgba(196,166,125,0.5)] hover:bg-[rgba(196,166,125,0.03)]"
      } ${className}`}
    >
      <div className="w-16 h-16 mx-auto mb-5 bg-[rgba(196,166,125,0.1)] rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#c4a67d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <p className={`text-base font-semibold ${light ? "text-[#0a0a0a]" : "text-white"}`}>{title}</p>
      <p className={`text-sm mt-1.5 ${light ? "text-[#777]" : "text-[rgba(255,255,255,0.5)]"}`}>Drag and drop or click to browse</p>
      <p className={`text-[11px] mt-3 ${light ? "text-[#aaa]" : "text-[rgba(255,255,255,0.3)]"}`}>{hint}</p>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { accept_(e.target.files?.[0]); e.target.value = ""; }}
      />

      {showCamera && (
        <>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => { accept_(e.target.files?.[0]); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}
            className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(196,166,125,0.9)] text-white text-sm font-semibold hover:bg-[#c4a67d] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
            </svg>
            Take Photo
          </button>
        </>
      )}
    </div>
  );
}
