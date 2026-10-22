import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

export interface DemoPair {
  before: string;
  after: string;
  width: number;
  height: number;
  beforeAlt: string;
  afterAlt: string;
  /** Short label for the edited side, e.g. "Staged, Modern". */
  afterLabel: string;
}

const KEY_STEP = 5;
const clamp = (n: number) => Math.min(100, Math.max(0, n));

// Intro: open on the original photo, glide to reveal the edit, then settle in
// the middle. [position %, milliseconds to get there]
const INTRO: Array<[number, number]> = [
  [94, 0],
  [94, 600],
  [26, 1500],
  [50, 700],
];
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface InteractiveDemoProps {
  pair: DemoPair;
  /** "framed": rounded card. "immersive": fills its parent edge to edge. */
  variant?: "framed" | "immersive";
  /** Play the one-time reveal on mount. */
  intro?: boolean;
  /** Vertical position of the drag handle, in % of the height. */
  handleTop?: number;
}

/**
 * Drag (or use the arrow keys) to compare an original photo with its edited
 * version. Pairs are aligned to the original, so the line never jumps.
 */
const InteractiveDemo = ({ pair, variant = "framed", intro = false, handleTop = 50 }: InteractiveDemoProps) => {
  const immersive = variant === "immersive";
  const playIntro = intro && !prefersReducedMotion();
  const [pos, setPos] = useState(playIntro ? INTRO[0][0] : 50);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  // Any input from the visitor ends the intro immediately.
  const touched = useRef(false);

  useEffect(() => {
    if (!playIntro) return;
    let raf = 0;
    let start = 0;
    const total = INTRO.reduce((sum, [, ms]) => sum + ms, 0);
    const frame = (now: number) => {
      if (touched.current) return;
      if (!start) start = now;
      let elapsed = now - start;
      let from = INTRO[0][0];
      for (const [to, ms] of INTRO.slice(1)) {
        if (elapsed <= ms) {
          setPos(from + (to - from) * easeInOut(elapsed / ms));
          raf = requestAnimationFrame(frame);
          return;
        }
        elapsed -= ms;
        from = to;
      }
      setPos(INTRO[INTRO.length - 1][0]);
    };
    raf = requestAnimationFrame(frame);
    const failsafe = window.setTimeout(() => {
      if (!touched.current) setPos(50);
    }, total + 500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
    };
  }, [playIntro]);

  const moveTo = useCallback((clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    setPos(clamp(((clientX - rect.left) / rect.width) * 100));
  }, []);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    touched.current = true;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    moveTo(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) moveTo(e.clientX);
  };
  const stopDrag = () => {
    dragging.current = false;
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const next: Record<string, number> = {
      ArrowLeft: pos - KEY_STEP,
      ArrowDown: pos - KEY_STEP,
      ArrowRight: pos + KEY_STEP,
      ArrowUp: pos + KEY_STEP,
      Home: 0,
      End: 100,
    };
    if (e.key in next) {
      touched.current = true;
      e.preventDefault();
      setPos(clamp(next[e.key]));
    }
  };

  const tag = "pointer-events-none absolute top-4 sm:top-5 rounded-md px-2.5 py-1 font-body text-xs sm:text-sm font-medium backdrop-blur-md";

  return (
    <div
      ref={frameRef}
      className={`relative overflow-hidden bg-card select-none cursor-ew-resize touch-pan-y ${
        immersive ? "h-full w-full" : "w-full aspect-[3/2] rounded-2xl"
      }`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
    >
      <img
        src={pair.after}
        alt={pair.afterAlt}
        width={pair.width}
        height={pair.height}
        // React 18 only knows the lowercase attribute.
        {...{ fetchpriority: "high" }}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <img
        src={pair.before}
        alt={pair.beforeAlt}
        width={pair.width}
        height={pair.height}
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />

      <span className={`${tag} left-4 sm:left-5 bg-white/85 text-foreground`}>Original</span>
      <span className={`${tag} right-4 sm:right-5 bg-black/60 text-white`}>{pair.afterLabel}</span>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare the original photo with the edited one"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% showing the original photo`}
        onKeyDown={onKeyDown}
        className="group absolute inset-y-0 -translate-x-1/2 w-10 flex justify-center focus-visible:outline-none"
        style={{ left: `${pos}%` }}
      >
        <span className="h-full w-[2px] bg-white/95 shadow-[0_0_0_1px_hsl(var(--foreground)/0.12)]" />
        <span
          className="absolute -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-foreground shadow-[0_6px_20px_-6px_hsl(var(--foreground)/0.5)] group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2"
          style={{ top: `${handleTop}%` }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M5.5 3.5 1.5 8l4 4.5M10.5 3.5l4 4.5-4 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
    </div>
  );
};

export default InteractiveDemo;
