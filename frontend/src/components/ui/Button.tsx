"use client";

import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] text-white shadow-[0_4px_20px_rgba(255,106,0,0.3)] hover:shadow-[0_6px_30px_rgba(255,106,0,0.45)] hover:-translate-y-0.5 active:scale-[0.97] disabled:from-[rgba(255,255,255,0.1)] disabled:to-[rgba(255,255,255,0.1)] disabled:text-[rgba(255,255,255,0.3)] disabled:shadow-none",
  secondary:
    "bg-transparent border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_0_16px_rgba(255,255,255,0.05)] active:bg-[rgba(255,255,255,0.08)] disabled:opacity-40",
  ghost:
    "bg-transparent text-[rgba(255,255,255,0.6)] hover:text-white hover:bg-[rgba(255,255,255,0.06)] active:bg-[rgba(255,255,255,0.08)] disabled:opacity-40",
  danger:
    "bg-[#EF4444] text-white hover:bg-[#DC2626] active:bg-[#B91C1C] shadow-[0_4px_16px_rgba(239,68,68,0.3)] disabled:opacity-40",
  accent:
    "bg-gradient-to-r from-[#FF6A00] to-[#FF8A3D] text-white shadow-[0_4px_20px_rgba(255,106,0,0.3)] hover:shadow-[0_6px_30px_rgba(255,106,0,0.45)] hover:-translate-y-0.5 disabled:opacity-40",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-xs rounded-[10px] gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-[14px] gap-2",
  lg: "px-6 py-3.5 text-[15px] rounded-2xl gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-semibold transition-all duration-250 cursor-pointer select-none ${variantStyles[variant]
          } ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${disabled || loading ? "cursor-not-allowed" : ""
          } ${className}`}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
