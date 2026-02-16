"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onImageSelected: (base64: string, preview: string) => void;
  /** If true, file inputs accept multiple files and onImageSelected is called once per file */
  multiple?: boolean;
  disabled?: boolean;
}

export default function UploadZone({
  onImageSelected,
  multiple,
  disabled,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onImageSelected(base64, base64);
      };
      reader.readAsDataURL(file);
    },
    [onImageSelected]
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files) return;
      const limit = multiple ? Math.min(files.length, 5) : 1;
      for (let i = 0; i < limit; i++) {
        handleFile(files[i]);
      }
    },
    [handleFile, multiple]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files);
      e.target.value = "";
    },
    [handleFiles]
  );

  return (
    <div className={`space-y-3 ${disabled ? "opacity-50 pointer-events-none" : ""}`}>
      {/* Main drop zone / browse button */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl p-8 sm:p-14 text-center
          transition-all duration-300 cursor-pointer
          ${
            isDragging
              ? "border-[#8b7355] bg-[#f5f0e8]/50 scale-[1.01]"
              : "border-[#e8e5df] hover:border-[#c4a67d] hover:bg-[#f5f0e8]/30"
          }
        `}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${
              isDragging ? "bg-[#8b7355] text-white scale-110" : "bg-[#f5f0e8] text-[#8b7355]"
            }`}
          >
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm sm:text-base font-semibold text-[#1b1b1f]">
              <span className="hidden sm:inline">
                {multiple ? "Drop your product images here" : "Drop your product image here"}
              </span>
              <span className="sm:hidden">
                {multiple ? "Tap to upload product images" : "Tap to upload product image"}
              </span>
            </p>
            <p className="text-xs sm:text-sm text-[#8c8c8c] mt-1">
              <span className="hidden sm:inline">
                {multiple ? "or click to browse — select up to 5 images" : "or click to browse — PNG, JPG up to 10MB"}
              </span>
              <span className="sm:hidden">
                {multiple ? "Select up to 5 images at once" : "PNG, JPG up to 10MB"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Camera button — visible on mobile/tablet only */}
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        className="sm:hidden w-full flex items-center justify-center gap-2.5 py-3 rounded-xl border border-[#e8e5df] bg-white text-[#1b1b1f] text-sm font-medium active:scale-[0.98] transition-all duration-200"
      >
        <svg className="w-5 h-5 text-[#8b7355]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
        </svg>
        Take Photo
      </button>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}
