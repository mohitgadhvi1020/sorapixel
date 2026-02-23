interface LogoProps {
  className?: string;
  variant?: "dark" | "light";
}

export default function Logo({ className = "text-xl", variant = "dark" }: LogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-[#1A1F2B]";
  return (
    <span className={`inline-flex items-center font-semibold tracking-tight select-none whitespace-nowrap ${textColor} ${className}`} style={{ letterSpacing: "-0.04em" }}>
      sora<span className="text-[#c4a67d]">i</span>pixel
    </span>
  );
}
