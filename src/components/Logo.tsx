interface LogoProps {
  className?: string;
  /** Use on dark backgrounds. */
  light?: boolean;
  /** Mark only, for tight spaces. */
  markOnly?: boolean;
}

const INK = "hsl(200 10% 8%)";

/**
 * A four-pane window: the left panes are empty, the right panes are filled.
 * Before and after, in one glyph.
 */
const LogoMark = ({ light = false }: { light?: boolean }) => (
  <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
    <rect width="28" height="28" rx="7" fill={light ? "#fff" : INK} />
    <g fill="none" stroke={light ? INK : "#fff"} strokeWidth="1.4">
      <rect x="7.2" y="7.2" width="5.6" height="5.6" rx="0.8" />
      <rect x="7.2" y="15.2" width="5.6" height="5.6" rx="0.8" />
    </g>
    <g fill={light ? "hsl(158 42% 22%)" : "hsl(152 38% 72%)"}>
      <rect x="15.2" y="7.2" width="5.6" height="5.6" rx="0.8" />
      <rect x="15.2" y="15.2" width="5.6" height="5.6" rx="0.8" />
    </g>
  </svg>
);

/** Window mark plus the serif wordmark. */
const Logo = ({ className = "", light = false, markOnly = false }: LogoProps) => (
  <span className={`inline-flex items-center gap-2.5 ${className}`}>
    <LogoMark light={light} />
    {!markOnly && (
      <span
        className={`font-display text-[1.375rem] font-medium leading-none tracking-[-0.015em] ${light ? "text-white" : "text-foreground"}`}
      >
        RealVision
      </span>
    )}
  </span>
);

export default Logo;
