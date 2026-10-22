import { useState, useRef, useCallback, useEffect } from "react";
import { Copy, Check, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import DownloadWithPresets from "@/components/DownloadWithPresets";
import { useNavigate } from "react-router-dom";
import { useUsage } from "@/hooks/useUsage";
import { stageRoom } from "@/lib/stagingApi";
import { toolInfo, type ToolId } from "@/config/tools";
import { cn } from "@/lib/utils";

export interface RefineContext {
  /** Saved staging behind `after`; refines edit its clean master. */
  stagingId?: string | null;
  /** Tool that made `after`; regenerate re-runs the same tool. */
  tool?: ToolId;
  roomType: string;
  style: string;
  propertyName?: string | null;
  customInstructions?: string | null;
  palette?: string | null;
}

const REFINE_CHIPS = ["Less furniture", "Warmer tones", "Different sofa", "More minimal", "Brighter", "Add plants"];
const MAX_REFINE = 120;
const KEY_STEP = 5;

interface Version {
  stagingId?: string | null;
  url: string;
  label: string;
  isWatermarked?: boolean;
}

interface BeforeAfterSliderProps {
  before: string;
  after: string;
  onReset?: () => void;
  isWatermarked?: boolean;
  mlsDisclosure?: boolean;
  refineContext?: RefineContext;
  /** Overrides the heading built from refineContext. */
  title?: string;
}

const stripRefinedSuffix = (s: string) => s.replace(/\s*\(refined\)\s*$/i, "");

function headingFor(ctx?: RefineContext): string {
  if (!ctx) return "Your staged photo";
  const room = ctx.roomType || "Room";
  const style = stripRefinedSuffix(ctx.style || "");
  if ((!ctx.tool || ctx.tool === "stage") && style && style !== "Removed") return `${style} ${room.toLowerCase()}`;
  const action = ctx.tool ? toolInfo(ctx.tool).label : style === "Removed" ? "Furniture removed" : style;
  return `${room}: ${action.toLowerCase()}`;
}

function convertToPngBlob(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("Canvas unavailable"));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG conversion failed"))), "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image load failed"));
    };
    img.src = objectUrl;
  });
}

async function downloadBlobFrom(url: string, filename: string) {
  const res = await fetch(url);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

const secondaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border bg-background text-sm font-medium text-foreground hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

/** Result view: before/after comparison, download, refine and version history. */
const BeforeAfterSlider = ({ before, after, onReset, isWatermarked, mlsDisclosure, refineContext, title }: BeforeAfterSliderProps) => {
  const navigate = useNavigate();
  const { canStage, refresh, usage, remainingStagings, freeLimit } = useUsage();
  const isFree = usage?.plan === "free";
  const isAdmin = usage?.plan === "admin";
  const [sliderPos, setSliderPos] = useState(50);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  // Session version history: v1 is the initial `after`; each refine/regenerate appends.
  const [versions, setVersions] = useState<Version[]>([
    { stagingId: refineContext?.stagingId, url: after, label: refineContext?.style || "v1", isWatermarked },
  ]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [refining, setRefining] = useState(false);
  const [freeText, setFreeText] = useState("");

  // A different `after` (a new staging opened) starts a new version history.
  useEffect(() => {
    setVersions([{ stagingId: refineContext?.stagingId, url: after, label: refineContext?.style || "v1", isWatermarked }]);
    setActiveIdx(0);
    setFreeText("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [after]);

  const currentVersion: Version = versions[activeIdx] ?? { stagingId: refineContext?.stagingId, url: after, label: "v1", isWatermarked };
  const currentAfter = currentVersion.url;
  const currentWatermarked = currentVersion.isWatermarked;

  // Size the frame to the image's natural aspect ratio.
  useEffect(() => {
    if (!currentAfter) return;
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) setAspectRatio(img.naturalWidth / img.naturalHeight);
    };
    img.src = currentAfter;
  }, [currentAfter]);

  const updateSlider = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    updateSlider(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) updateSlider(e.clientX);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onSliderKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? KEY_STEP * 2 : KEY_STEP;
    const moves: Record<string, (p: number) => number> = {
      ArrowLeft: (p) => p - step,
      ArrowDown: (p) => p - step,
      ArrowRight: (p) => p + step,
      ArrowUp: (p) => p + step,
      PageDown: (p) => p - 25,
      PageUp: (p) => p + 25,
      Home: () => 0,
      End: () => 100,
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    setSliderPos((p) => Math.max(0, Math.min(100, move(p))));
  };

  const handleCopyToClipboard = async () => {
    try {
      const response = await fetch(currentAfter);
      const blob = await response.blob();
      const pngBlob = blob.type === "image/png" ? blob : await convertToPngBlob(blob);
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      setCopied(true);
      toast.success("Image copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("This browser can't copy images. Downloading it instead.");
      try {
        await downloadBlobFrom(currentAfter, "staged-room.jpg");
      } catch {
        toast.error("The download didn't start. Please try again.");
      }
    }
  };

  const runStaging = async (opts: { mode: ToolId | "refine"; refineInstruction?: string; versionLabel: string }) => {
    if (!refineContext) return false;
    if (!canStage) {
      toast.error(isFree ? `You've used your ${freeLimit} free stagings this month.` : "You've used this month's stagings.", {
        action: { label: "See plans", onClick: () => navigate("/pricing") },
      });
      return false;
    }
    if (opts.mode === "refine" && !currentVersion.stagingId) {
      toast.error("Open this staging from My stagings to refine it.");
      return false;
    }
    setRefining(true);
    try {
      const result = await stageRoom({
        mode: opts.mode,
        parentId: opts.mode === "refine" ? currentVersion.stagingId ?? undefined : undefined,
        originalUrl: opts.mode !== "refine" ? before : undefined,
        roomType: refineContext.roomType,
        style: stripRefinedSuffix(refineContext.style),
        refineInstruction: opts.refineInstruction,
        customInstructions: opts.mode === "stage" ? refineContext.customInstructions || "" : undefined,
        mlsDisclosure: !!mlsDisclosure,
        palette: refineContext.palette || undefined,
        propertyName: refineContext.propertyName || undefined,
      });
      const row = result.stagings[0];
      setVersions((prev) => {
        const next = [...prev, { stagingId: row.id, url: row.staged_image_url, label: opts.versionLabel, isWatermarked: result.isWatermarked }];
        setActiveIdx(next.length - 1);
        return next;
      });
      toast.success(opts.mode === "refine" ? "Refined version added" : "New take added");
      return true;
    } catch (err) {
      console.error(`${opts.mode} failed:`, err);
      toast.error(err instanceof Error ? err.message : "That didn't work. Please try again.");
      return false;
    } finally {
      await refresh();
      setRefining(false);
    }
  };

  const handleRefine = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const instruction = freeText.trim();
    if (!instruction) return toast.error("Describe the change you want first.");
    if (!refineContext) return;
    const ok = await runStaging({
      mode: "refine",
      refineInstruction: instruction,
      versionLabel: `${stripRefinedSuffix(refineContext.style)} (refined)`,
    });
    if (ok) setFreeText("");
  };

  const handleRegenerate = () => {
    if (!refineContext) return;
    const base = stripRefinedSuffix(refineContext.style);
    // Re-run whatever made this image; legacy rows only know their style.
    const tool: ToolId = refineContext.tool ?? (base === "Removed" ? "remove" : "stage");
    if (tool === "recolor") {
      toast.info("Run a new recolor from the studio to try another finish.");
      return;
    }
    void runStaging({ mode: tool, versionLabel: `${base}, new take` });
  };

  const addChip = (chip: string) => {
    setFreeText((v) => {
      const cur = v.trim();
      const addition = chip.toLowerCase();
      if (!cur) return chip;
      if (cur.toLowerCase().includes(addition)) return cur;
      const combined = `${cur}, ${addition}`;
      return combined.length > MAX_REFINE ? cur : combined;
    });
  };

  const pos = Math.round(sliderPos);
  const heading = title ?? headingFor(refineContext);

  return (
    <section className="py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-normal tracking-[-0.02em]">{heading}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Drag the handle, or focus it and use the arrow keys, to compare.</p>
          </div>
          {onReset && (
            <button type="button" onClick={onReset} className={secondaryBtn}>
              <RotateCcw className="w-4 h-4" aria-hidden />
              Stage another photo
            </button>
          )}
        </div>

        <div
          ref={containerRef}
          className="relative mx-auto rounded-xl overflow-hidden border border-border bg-card select-none cursor-col-resize touch-pan-y"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            aspectRatio: aspectRatio ? `${aspectRatio}` : "4 / 3",
            maxHeight: "75vh",
            width: aspectRatio ? `min(100%, calc(75vh * ${aspectRatio}))` : "100%",
          }}
        >
          <img src={currentAfter} alt="After: staged photo" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
          <img
            src={before}
            alt="Before: original photo"
            draggable={false}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          />

          <div className="absolute inset-y-0 z-10 -translate-x-1/2 pointer-events-none" style={{ left: `${sliderPos}%` }}>
            <div className="w-0.5 h-full bg-background shadow-soft" />
          </div>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Before and after comparison"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pos}
            aria-valuetext={`${pos}% original photo shown`}
            onKeyDown={onSliderKey}
            className="absolute top-1/2 z-20 w-11 h-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent text-accent-foreground border-2 border-background shadow-soft flex items-center justify-center cursor-grab active:cursor-grabbing"
            style={{ left: `${sliderPos}%` }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M5 3L2 8L5 13" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M11 3L14 8L11 13" stroke="currentColor" strokeWidth="1.5" fill="none" />
            </svg>
          </div>

          <span className="absolute top-3 left-3 z-10 rounded-sm bg-foreground/75 text-background px-2 py-1 text-xs font-medium pointer-events-none">
            Before
          </span>
          <span className="absolute top-3 right-3 z-10 rounded-sm bg-background/90 text-foreground px-2 py-1 text-xs font-medium pointer-events-none">
            After
          </span>
        </div>

        {versions.length > 1 && (
          <div className="mt-4">
            <p className="text-xs font-medium text-muted-foreground mb-2">Versions</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {versions.map((v, i) => (
                <button
                  key={`${v.url}-${i}`}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  aria-pressed={i === activeIdx}
                  aria-label={`Version ${i + 1}: ${v.label}`}
                  title={v.label}
                  className={cn(
                    "relative shrink-0 w-20 h-16 rounded-md overflow-hidden border-2 transition-colors",
                    i === activeIdx ? "border-accent" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <img src={v.url} alt="" className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 left-1 rounded-sm bg-background/90 px-1 text-[10px] font-medium tabular-nums">v{i + 1}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <DownloadWithPresets
            imageUrl={currentAfter}
            filename="staged-room"
            variant="gold"
            isWatermarked={currentWatermarked}
            mlsDisclosure={mlsDisclosure}
          />
          <button type="button" onClick={handleCopyToClipboard} className={secondaryBtn}>
            {copied ? <Check className="w-4 h-4" aria-hidden /> : <Copy className="w-4 h-4" aria-hidden />}
            {copied ? "Copied" : "Copy image"}
          </button>
          {refineContext && (
            <button type="button" onClick={handleRegenerate} disabled={refining} className={secondaryBtn}>
              <RefreshCw className="w-4 h-4" aria-hidden />
              New take
            </button>
          )}
        </div>

        {currentWatermarked && (
          <p className="mt-3 text-sm text-muted-foreground">
            Free results carry a small watermark.{" "}
            <button type="button" onClick={() => navigate("/pricing")} className="font-medium text-accent hover:underline">
              See plans
            </button>{" "}
            for clean, full-resolution downloads.
          </p>
        )}

        {refineContext && (
          <form onSubmit={handleRefine} className="mt-8 rounded-xl border border-border bg-background p-5 sm:p-6">
            <h3 className="text-lg font-semibold tracking-tight">Refine this result</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Describe a change and we'll edit this image. "New take" re-runs the same settings from scratch.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {REFINE_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  disabled={refining}
                  onClick={() => addChip(chip)}
                  className="h-9 px-3.5 rounded-md border border-border bg-background text-sm text-foreground/80 hover:border-foreground/30 hover:text-foreground transition-colors disabled:opacity-40"
                >
                  {chip}
                </button>
              ))}
            </div>

            <label htmlFor="refine-text" className="block mt-4 text-sm font-medium">
              Your change
            </label>
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              <input
                id="refine-text"
                type="text"
                value={freeText}
                maxLength={MAX_REFINE}
                disabled={refining}
                onChange={(e) => setFreeText(e.target.value.slice(0, MAX_REFINE))}
                placeholder="e.g. swap the sofa for a leather one"
                className="flex-1 min-w-0 h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={refining || !freeText.trim()}
                className="gold-gradient-animated h-10 px-5 rounded-md text-sm font-medium inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {refining && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                {refining ? "Working…" : "Apply change"}
              </button>
            </div>
            <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>
                {isAdmin ? "Admin: unlimited" : `Each change or new take uses 1 staging. ${remainingStagings} left this month.`}
              </span>
              <span className="tabular-nums">
                {freeText.length}/{MAX_REFINE}
              </span>
            </div>

            {!canStage && usage && (
              <p className="mt-4 rounded-md border border-border bg-card px-3 py-2.5 text-sm">
                {isFree ? `You've used your ${freeLimit} free stagings this month.` : "You've used this month's stagings."}{" "}
                <button type="button" onClick={() => navigate("/pricing")} className="font-medium text-accent hover:underline">
                  See plans
                </button>
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
};

export default BeforeAfterSlider;
