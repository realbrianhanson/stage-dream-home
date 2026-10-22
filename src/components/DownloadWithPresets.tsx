import { useState, useEffect, useRef } from "react";
import { Download, ChevronDown, Lock } from "lucide-react";
import { toast } from "sonner";
import { useUsage } from "@/hooks/useUsage";

interface DimensionPreset {
  label: string;
  width: number | null;
  height: number | null;
  description: string;
  longEdge?: number;
  paidOnly?: boolean;
}

const PRESETS: DimensionPreset[] = [
  { label: "Original size", width: null, height: null, description: "Full resolution, no resizing" },
  { label: "MLS standard", width: 1024, height: 768, description: "1024 × 768, a common MLS size" },
  { label: "Website", width: 800, height: 600, description: "800 × 600, small and fast" },
  { label: "Social square", width: 1024, height: 1024, description: "1024 × 1024 for Instagram and Facebook" },
  { label: "MLS print", width: null, height: null, longEdge: 3000, description: "3000 px on the long edge", paidOnly: true },
];

type Format = "jpg" | "png";

function cropToCanvas(
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): HTMLCanvasElement {
  const targetRatio = targetW / targetH;
  const srcRatio = img.naturalWidth / img.naturalHeight;

  let cropW: number, cropH: number, cropX: number, cropY: number;

  if (srcRatio > targetRatio) {
    cropH = img.naturalHeight;
    cropW = Math.round(cropH * targetRatio);
    cropX = Math.round((img.naturalWidth - cropW) / 2);
    cropY = 0;
  } else {
    cropW = img.naturalWidth;
    cropH = Math.round(cropW / targetRatio);
    cropX = 0;
    cropY = Math.round((img.naturalHeight - cropH) / 2);
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d")!;
  // For JPEG output we need a solid background under any transparency.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetW, targetH);
  ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, format: Format): Promise<Blob | null> {
  const mime = format === "png" ? "image/png" : "image/jpeg";
  const quality = format === "jpg" ? 0.9 : undefined;
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), mime, quality));
}

function resizeToLongEdge(img: HTMLImageElement, longEdge: number): HTMLCanvasElement {
  const src = Math.max(img.naturalWidth, img.naturalHeight);
  const scale = longEdge / src;
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

function processImage(
  img: HTMLImageElement,
  preset: DimensionPreset,
  format: Format
): Promise<Blob | null> {
  let canvas: HTMLCanvasElement;
  if (preset.longEdge) {
    canvas = resizeToLongEdge(img, preset.longEdge);
  } else if (preset.width && preset.height) {
    canvas = cropToCanvas(img, preset.width, preset.height);
  } else {
    canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    if (format === "jpg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);
  }
  return canvasToBlob(canvas, format);
}

async function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface DownloadWithPresetsProps {
  imageUrl: string;
  filename?: string;
  variant?: "gold" | "outline";
  isWatermarked?: boolean;
  mlsDisclosure?: boolean;
}

const DownloadWithPresets = ({
  imageUrl,
  filename = "staged-room",
  variant = "gold",
  mlsDisclosure = false,
}: DownloadWithPresetsProps) => {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("jpg");
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { usage } = useUsage();
  const isPaid = !!usage && usage.plan !== "free";

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    const onLoad = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.addEventListener("load", onLoad);
    img.src = imageUrl;
    return () => img.removeEventListener("load", onLoad);
  }, [imageUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const isPresetDisabled = (preset: DimensionPreset) => {
    if (preset.paidOnly && !isPaid) return true;
    if (!preset.width || !preset.height || !imgSize) return false;
    return imgSize.w < preset.width || imgSize.h < preset.height;
  };

  const handleDownload = async (preset: DimensionPreset) => {
    if (isPresetDisabled(preset)) return;
    setOpen(false);
    setProcessing(true);
    try {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Image load failed"));
        img.src = imageUrl;
      });

      const blob = await processImage(img, preset, format);
      if (!blob) throw new Error("Failed to process image");

      const dims = preset.longEdge
        ? `-${preset.longEdge}`
        : preset.width
        ? `-${preset.width}x${preset.height}`
        : "";
      const mlsTag = mlsDisclosure ? "-virtually-staged" : "";
      await triggerBlobDownload(blob, `${filename}${dims}${mlsTag}.${format}`);
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Couldn't resize the photo. Downloading the original file instead.");
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const mlsTag = mlsDisclosure ? "-virtually-staged" : "";
        await triggerBlobDownload(blob, `${filename}${mlsTag}.${format}`);
      } catch {
        toast.error("Download failed. Check your connection and try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const btnBase =
    variant === "gold"
      ? "gold-gradient-animated h-11 px-5 text-sm font-medium rounded-md"
      : "h-10 w-10 justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-card hover:text-foreground transition-colors";

  return (
    <div className="relative" ref={menuRef} onKeyDown={(e) => e.key === "Escape" && setOpen(false)}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={processing}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={variant === "gold" ? undefined : "Download"}
        className={`${btnBase} inline-flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60`}
      >
        <Download className="h-4 w-4" />
        {variant === "gold" && (
          <>
            {processing ? "Preparing…" : "Download"}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Download size"
          className="absolute bottom-full right-0 z-50 mb-2 w-[min(17rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-border bg-background shadow-soft"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2.5">
            <span className="text-xs font-medium text-muted-foreground" id="download-format-label">
              File type
            </span>
            <div role="radiogroup" aria-labelledby="download-format-label" className="flex rounded-md border border-border p-0.5">
              {(["jpg", "png"] as Format[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  role="radio"
                  aria-checked={format === f}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormat(f);
                  }}
                  className={`rounded-[5px] px-2.5 py-1 text-xs font-medium uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    format === f ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="py-1">
            {PRESETS.map((preset) => {
              const disabled = isPresetDisabled(preset);
              const lockedForPlan = preset.paidOnly && !isPaid;
              return (
                <button
                  key={preset.label}
                  type="button"
                  role="menuitem"
                  onClick={() => handleDownload(preset)}
                  disabled={disabled}
                  className={`flex w-full items-start justify-between gap-3 px-3 py-2 text-left transition-colors focus-visible:bg-card focus-visible:outline-none ${
                    disabled ? "cursor-not-allowed opacity-50" : "hover:bg-card"
                  }`}
                  title={
                    lockedForPlan
                      ? "Available on paid plans"
                      : disabled
                      ? "The source image is smaller than this size"
                      : undefined
                  }
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{preset.label}</span>
                    <span className="block text-xs tabular-nums text-muted-foreground">
                      {preset.description}
                      {!lockedForPlan && disabled && ". Source is too small"}
                    </span>
                  </span>
                  {lockedForPlan && (
                    <span className="mt-0.5 inline-flex flex-shrink-0 items-center gap-1 rounded-sm border border-border px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                      <Lock className="h-3 w-3" aria-hidden />
                      Paid plans
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DownloadWithPresets;
