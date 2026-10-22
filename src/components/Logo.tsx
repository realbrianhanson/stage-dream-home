interface LogoProps {
  className?: string;
  /** Use on dark backgrounds. */
  light?: boolean;
}

/** Wordmark: a small accent mark plus the product name. */
const Logo = ({ className = "", light = false }: LogoProps) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <span className="w-6 h-6 rounded-md bg-accent text-accent-foreground flex items-center justify-center shrink-0" aria-hidden>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M2 6.2 7 2l5 4.2V12H2V6.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M5.5 12V8.5h3V12" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </span>
    <span className={`text-lg font-semibold tracking-tight leading-none ${light ? "text-primary-foreground" : "text-foreground"}`}>
      RealVision
    </span>
  </span>
);

export default Logo;
