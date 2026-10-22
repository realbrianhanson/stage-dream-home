import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import beforeLiving from "@/assets/before-vacant.jpg";
import afterLiving from "@/assets/after-staged.jpg";

// The one real pair we ship: the same living room photo, before and after
// "Add furniture" in the Modern style. Both images are 3:2.
const PAIR = {
  before: beforeLiving,
  after: afterLiving,
  caption: "Living room, Modern style",
  width: 1248,
  height: 832,
};

const KEY_STEP = 5;
const clamp = (n: number) => Math.min(100, Math.max(0, n));

// Hero intro: open on the vacant room, glide to reveal the staging, then
// settle in the middle. [position %, milliseconds to get there]
const INTRO: Array<[number, number]> = [
  [92, 0],
  [92, 700],
  [28, 1500],
  [50, 700],
];
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Drag (or use the arrow keys) to compare a vacant photo with its staged
 * version. Lightweight on purpose: the full results viewer lives in the app.
 */
const InteractiveDemo = ({ variant = "inline" }: { variant?: "inline" | "hero" }) => {
  const hero = variant === "hero";
  const playIntro = hero && !prefersReducedMotion();
  const [pos, setPos] = useState(playIntro ? INTRO[0][0] : 50);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  // Any user input ends the intro immediately.
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
          setPos(from + (to - from) * easeInOut(ms === 0 ? 1 : elapsed / ms));
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

  return (
    <figure className="m-0">
      <div
        ref={frameRef}
        className={`relative w-full overflow-hidden bg-card select-none cursor-ew-resize touch-pan-y ${
          hero
            ? "aspect-[4/3] sm:aspect-[16/9] rounded-2xl shadow-[0_40px_80px_-40px_hsl(200_10%_8%/0.45)]"
            : "aspect-[3/2] rounded-xl border border-border shadow-soft"
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
      >
        <img
          src={PAIR.after}
          alt="The same living room staged with a sectional sofa, rug, coffee table and art"
          width={PAIR.width}
          height={PAIR.height}
          // React 18 only knows the lowercase attribute.
          {...{ fetchpriority: "high" }}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <img
          src={PAIR.before}
          alt="An empty living room with wood floors and large windows"
          width={PAIR.width}
          height={PAIR.height}
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />

        <span
          className={`pointer-events-none absolute rounded-md font-body font-medium backdrop-blur-md ${
            hero ? "left-4 bottom-4 sm:left-6 sm:bottom-6 bg-white/85 px-3 py-1.5 text-sm text-foreground" : "left-3 top-3 bg-background/90 px-2 py-1 text-xs text-foreground"
          }`}
        >
          {hero ? (<><span className="sm:hidden">Before</span><span className="hidden sm:inline">Before: vacant</span></>) : "Before"}
        </span>
        <span
          className={`pointer-events-none absolute rounded-md font-body font-medium backdrop-blur-md ${
            hero ? "right-4 bottom-4 sm:right-6 sm:bottom-6 bg-foreground/80 px-3 py-1.5 text-sm text-background" : "right-3 top-3 bg-accent px-2 py-1 text-xs text-accent-foreground"
          }`}
        >
          {hero ? (<><span className="sm:hidden">After</span><span className="hidden sm:inline">After: staged, Modern</span></>) : "After"}
        </span>

        <div
          role="slider"
          tabIndex={0}
          aria-label="Compare before and after"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          aria-valuetext={`${Math.round(pos)}% showing the original photo`}
          onKeyDown={onKeyDown}
          className="group absolute inset-y-0 -translate-x-1/2 w-10 flex justify-center focus-visible:outline-none"
          style={{ left: `${pos}%` }}
        >
          <span className="h-full w-0.5 bg-background shadow-[0_0_0_1px_hsl(var(--foreground)/0.15)]" />
          <span className="absolute top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-soft group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M5.5 3.5 1.5 8l4 4.5M10.5 3.5l4 4.5-4 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>
      <figcaption className={`mt-3 flex items-center justify-between gap-4 font-body text-sm text-muted-foreground ${hero ? "sr-only" : ""}`}>
        <span>{PAIR.caption}</span>
        <span className="hidden sm:inline">Drag to compare</span>
      </figcaption>
    </figure>
  );
};

export default InteractiveDemo;
