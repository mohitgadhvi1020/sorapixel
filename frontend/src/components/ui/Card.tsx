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
    default: "bg-white border border-border",
    accent: "bg-accent-lighter border border-accent/20",
    glass: "glass border border-white/20",
  };

  return (
    <div
      onClick={onClick}
      className={`rounded-2xl ${variantStyles[variant]} shadow-[var(--shadow-xs)] ${paddingStyles[padding]
        } ${hover ? "hover:shadow-[var(--shadow-md)] hover:border-border-hover hover:-translate-y-0.5 transition-all duration-300 cursor-pointer" : "transition-colors duration-200"
        } ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
