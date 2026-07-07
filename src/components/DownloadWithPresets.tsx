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
  { label: "Original Size", width: null, height: null, description: "No resizing" },
  { label: "MLS Standard", width: 1024, height: 768, description: "1024 × 768" },
  { label: "Web Optimized", width: 800, height: 600, description: "800 × 600" },
  { label: "Social Square", width: 1024, height: 1024, description: "1024 × 1024" },
  { label: "MLS Print (3000px)", width: null, height: null, longEdge: 3000, description: "High-res, long edge 3000px", paidOnly: true },
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

function processImage(
  img: HTMLImageElement,
  targetW: number | null,
  targetH: number | null,
  format: Format
): Promise<Blob | null> {
  let canvas: HTMLCanvasElement;
  if (targetW && targetH) {
    canvas = cropToCanvas(img, targetW, targetH);
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
}

const DownloadWithPresets = ({
  imageUrl,
  filename = "staged-room",
  variant = "gold",
}: DownloadWithPresetsProps) => {
  const [open, setOpen] = useState(false);
  const [format, setFormat] = useState<Format>("jpg");
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

      const blob = await processImage(img, preset.width, preset.height, format);
      if (!blob) throw new Error("Failed to process image");

      const dims = preset.width ? `-${preset.width}x${preset.height}` : "";
      await triggerBlobDownload(blob, `${filename}${dims}.${format}`);
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Failed to prepare download — retrying with original file.");
      try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        await triggerBlobDownload(blob, `${filename}.${format}`);
      } catch {
        toast.error("Download failed. Please try again.");
      }
    } finally {
      setProcessing(false);
    }
  };

  const btnBase =
    variant === "gold"
      ? "gold-gradient-animated text-accent-foreground font-body font-semibold text-sm px-8 py-3 rounded-lg"
      : "w-10 h-10 rounded-lg border border-white/[0.06] text-muted-foreground hover:text-accent hover:border-accent/20 flex items-center justify-center transition-colors";

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={processing}
        className={`${btnBase} flex items-center gap-2`}
      >
        <Download className="w-4 h-4" />
        {variant === "gold" && (
          <>
            {processing ? "Processing..." : "Download"}
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-50 min-w-[240px] rounded-xl border border-white/[0.08] bg-background/95 backdrop-blur-lg shadow-dramatic overflow-hidden">
          {/* Format toggle */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06]">
            <span className="font-body text-[11px] tracking-wider uppercase text-muted-foreground/70">
              Format
            </span>
            <div className="flex gap-1">
              {(["jpg", "png"] as Format[]).map((f) => (
                <button
                  key={f}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFormat(f);
                  }}
                  className={`font-body text-[11px] font-semibold uppercase px-2.5 py-1 rounded-md transition-colors ${
                    format === f
                      ? "bg-accent/15 text-accent border border-accent/25"
                      : "text-muted-foreground/70 border border-transparent hover:text-foreground"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {PRESETS.map((preset) => {
            const disabled = isPresetDisabled(preset);
            return (
              <button
                key={preset.label}
                onClick={() => handleDownload(preset)}
                disabled={disabled}
                className={`w-full text-left px-4 py-2.5 font-body text-sm transition-colors ${
                  disabled
                    ? "text-muted-foreground/30 cursor-not-allowed"
                    : "text-foreground hover:bg-accent/[0.06] hover:text-accent"
                }`}
                title={disabled ? "Source image too small for this size" : undefined}
              >
                <span className="block font-medium text-xs">{preset.label}</span>
                <span className={`block text-[11px] ${disabled ? "text-muted-foreground/20" : "text-muted-foreground/60"}`}>
                  {preset.description}
                  {disabled && " — source too small"}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DownloadWithPresets;
