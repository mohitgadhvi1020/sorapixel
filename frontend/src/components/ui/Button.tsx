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
    "bg-accent text-white hover:bg-accent-dark active:bg-[#4b28c4] shadow-[0_2px_8px_rgba(108,71,255,0.25)] hover:shadow-[0_4px_14px_rgba(108,71,255,0.35)] disabled:bg-border disabled:text-text-secondary disabled:shadow-none",
  secondary:
    "bg-white border border-border text-foreground hover:bg-surface-hover hover:border-border-hover active:bg-border disabled:opacity-50",
  ghost:
    "bg-transparent text-text-secondary hover:text-foreground hover:bg-surface-hover active:bg-border disabled:opacity-50",
  danger:
    "bg-error text-white hover:bg-red-600 active:bg-red-700 shadow-[0_2px_8px_rgba(239,68,68,0.25)] disabled:opacity-50",
  accent:
    "bg-accent text-white hover:bg-accent-dark active:bg-[#4b28c4] shadow-[0_2px_8px_rgba(108,71,255,0.25)] disabled:opacity-50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3.5 py-2 text-xs rounded-[10px] gap-1.5",
  md: "px-5 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3.5 text-[15px] rounded-2xl gap-2",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, fullWidth, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center font-semibold transition-all duration-200 cursor-pointer select-none ${variantStyles[variant]
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
