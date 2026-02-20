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
          <label className="block text-sm font-medium text-foreground">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-3 rounded-xl border bg-white text-foreground text-sm placeholder:text-text-secondary/60 outline-none transition-all duration-200 ${
            error
              ? "border-error focus:border-error focus:ring-1 focus:ring-error/20"
              : "border-border focus:border-charcoal focus:ring-1 focus:ring-charcoal/10 hover:border-border-hover"
          } ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-error">{error}</p>}
        {hint && !error && <p className="text-xs text-text-secondary">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
