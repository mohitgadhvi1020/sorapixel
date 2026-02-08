"use client";

import { useCallback } from "react";

interface LogoUploadProps {
  logoPreview: string | null;
  onLogoSelected: (base64: string) => void;
  onRemove: () => void;
}

export default function LogoUpload({
  logoPreview,
  onLogoSelected,
  onRemove,
}: LogoUploadProps) {
  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        onLogoSelected(base64);
      };
      reader.readAsDataURL(file);
    },
    [onLogoSelected]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  if (logoPreview) {
    return (
      <div className="flex items-center gap-3 animate-scale-in">
        <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#e8e5df] bg-white shadow-sm flex-shrink-0 p-1.5">
          <img
            src={logoPreview}
            alt="Brand logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1b1b1f]">Logo uploaded</p>
          <p className="text-xs text-[#8c8c8c]">
            Will appear on all generated images
          </p>
        </div>
        <button
          onClick={onRemove}
          className="text-xs text-[#8c8c8c] hover:text-red-500 transition-colors duration-300 flex-shrink-0"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <label className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-[#e8e5df] hover:border-[#c4a67d] hover:bg-[#f5f0e8]/30 transition-all duration-300 cursor-pointer group">
      <input
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />
      <div className="w-10 h-10 rounded-lg bg-[#f5f0e8] text-[#8b7355] flex items-center justify-center flex-shrink-0 transition-all duration-300 group-hover:bg-[#8b7355] group-hover:text-white">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-[#1b1b1f]">
          Upload brand logo
          <span className="text-[#8c8c8c] font-normal ml-1">(optional)</span>
        </p>
        <p className="text-xs text-[#8c8c8c]">
          PNG with transparent background works best
        </p>
      </div>
    </label>
  );
}
