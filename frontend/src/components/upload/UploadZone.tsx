"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onImageSelected: (base64: string, preview: string) => void;
  disabled?: boolean;
}

export default function UploadZone({
  onImageSelected,
  disabled,
}: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
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
    [onImageSelected],
  );

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.length) return;
      handleFile(files[0]);
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
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
    [handleFiles],
  );

  return (
    <div
      className={`space-y-3 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
        className={`relative border-2 border-dashed rounded-[20px] p-8 sm:p-14 text-center transition-all duration-300 cursor-pointer ${isDragging
            ? "border-[#FF6A00] bg-[rgba(255,106,0,0.08)] scale-[1.01] shadow-[0_0_30px_rgba(255,106,0,0.15)]"
            : "border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,106,0,0.4)] hover:bg-[rgba(255,255,255,0.02)]"
          }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center transition-all duration-300 ${isDragging
                ? "bg-gradient-to-br from-[#FF6A00] to-[#FF8A3D] text-white scale-110 shadow-[0_0_20px_rgba(255,106,0,0.3)]"
                : "bg-[rgba(255,106,0,0.1)] text-[#FF8A3D]"
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
            <p className="text-sm sm:text-base font-semibold text-white">
              Drop your product photo here
            </p>
            <p className="text-xs sm:text-sm text-[rgba(255,255,255,0.4)] mt-1">
              or click to browse — PNG, JPG up to 10MB
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
