interface TokenIconProps {
  size?: number;
  className?: string;
}

export default function TokenIcon({ size = 14, className }: TokenIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="10" cy="10" r="9" fill="url(#token-grad)" />
      <circle cx="10" cy="10" r="9" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
      {/* Inner ring */}
      <circle cx="10" cy="10" r="6.5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.75" fill="none" />
      {/* S letter mark */}
      <path
        d="M7.5 12.5c0 .83.67 1.5 1.5 1.5h2c.83 0 1.5-.67 1.5-1.5S11.83 11 11 11H9c-.83 0-1.5-.67-1.5-1.5S8.17 8 9 8h2c.83 0 1.5.67 1.5 1.5"
        stroke="rgba(255,255,255,0.9)"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="token-grad" x1="1" y1="1" x2="19" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#d4a853" />
          <stop offset="0.5" stopColor="#c4a67d" />
          <stop offset="1" stopColor="#8b7355" />
        </linearGradient>
      </defs>
    </svg>
  );
}
