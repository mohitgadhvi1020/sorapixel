"use client";

import { forwardRef } from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-xs font-medium text-[rgba(255,255,255,0.5)] uppercase tracking-[0.05em]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-3 rounded-[14px] border bg-[rgba(255,255,255,0.04)] text-white text-sm placeholder:text-[rgba(255,255,255,0.25)] outline-none transition-all duration-250 ${error
              ? "border-[#EF4444] focus:border-[#EF4444] focus:shadow-[0_0_0_3px_rgba(239,68,68,0.15)]"
              : "border-[rgba(255,255,255,0.08)] focus:border-[#FF6A00] focus:shadow-[0_0_0_3px_rgba(255,106,0,0.15)] hover:border-[rgba(255,255,255,0.14)]"
            } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-[#EF4444]">{error}</p>}
        {hint && !error && <p className="text-xs text-[rgba(255,255,255,0.4)]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
