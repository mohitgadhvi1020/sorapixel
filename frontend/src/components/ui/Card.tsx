"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg" | "none";
  hover?: boolean;
  onClick?: () => void;
  variant?: "default" | "accent" | "glass";
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-5 md:p-6",
  lg: "p-6 md:p-8",
};

export default function Card({ children, className = "", padding = "md", hover = false, onClick, variant = "default" }: CardProps) {
  const variantStyles = {
    default: "bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)]",
    accent: "bg-[rgba(255,106,0,0.06)] border border-[rgba(255,106,0,0.15)]",
    glass: "glass",
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-[20px] ${variantStyles[variant]} shadow-[0_8px_24px_rgba(0,0,0,0.3)] ${paddingStyles[padding]
        } ${hover ? "hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] hover:border-[rgba(255,255,255,0.12)] hover:-translate-y-1 transition-all duration-300 cursor-pointer" : "transition-colors duration-250"
        } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
