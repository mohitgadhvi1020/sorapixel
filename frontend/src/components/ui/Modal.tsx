"use client";

import { useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
  sheet?: boolean;
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export default function Modal({ open, onClose, title, children, size = "md", sheet = false }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  if (sheet) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
        <div className="absolute bottom-0 left-0 right-0 bg-[#1A1B22] rounded-t-2xl animate-slide-up max-h-[90vh] overflow-y-auto border-t border-[rgba(255,255,255,0.08)]">
          <div className="sticky top-0 bg-[#1A1B22] px-6 pt-5 pb-4 border-b border-[rgba(255,255,255,0.06)] z-10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[rgba(255,255,255,0.5)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          <div className="px-6 py-5 pb-8">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className={`relative ${sizeStyles[size]} w-full bg-[#1A1B22] rounded-[20px] shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[rgba(255,255,255,0.08)] animate-scale-in`}>
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[rgba(255,255,255,0.06)]">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors text-[rgba(255,255,255,0.5)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
