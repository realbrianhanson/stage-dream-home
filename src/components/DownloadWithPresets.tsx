import { useState, useEffect, useRef } from "react";
import { Download, ChevronDown } from "lucide-react";
import { toast } from "sonner";

interface DimensionPreset {
  label: string;
  width: number | null;
  height: number | null;
  description: string;
}

const PRESETS: DimensionPreset[] = [
  { label: "Original Size", width: null, height: null, description: "No processing" },
  { label: "MLS Standard", width: 1024, height: 768, description: "1024 × 768" },
  { label: "Web Optimized", width: 800, height: 600, description: "800 × 600" },
  { label: "Social Square", width: 1024, height: 1024, description: "1024 × 1024" },
];

function cropAndResize(
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
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
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function burnWatermark(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d")!;
  const fontSize = Math.max(14, Math.round(canvas.width * 0.018));
  ctx.save();
  ctx.font = `${fontSize}px 'DM Sans', sans-serif`;
  ctx.fillStyle = `rgba(255, 255, 255, 0.3)`;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("Staged by RealVision", canvas.width - 16, canvas.height - 12);
  ctx.restore();
}

function imageToWatermarkedBlob(img: HTMLImageElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    burnWatermark(canvas);
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function cropResizeAndWatermark(
  img: HTMLImageElement,
  targetW: number,
  targetH: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
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
    ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);
    burnWatermark(canvas);
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
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
  isWatermarked = false,
}: DownloadWithPresetsProps) => {
  const [open, setOpen] = useState(false);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = imageUrl;
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
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imageUrl;
      });

      let blob: Blob | null;

      if (!preset.width || !preset.height) {
        // Original size
        if (isWatermarked) {
          blob = await imageToWatermarkedBlob(img);
        } else {
          // Direct download for non-watermarked original
          const link = document.createElement("a");
          link.href = imageUrl;
          link.download = `${filename}.png`;
          link.click();
          setProcessing(false);
          return;
        }
      } else {
        // Crop/resize
        blob = isWatermarked
          ? await cropResizeAndWatermark(img, preset.width, preset.height)
          : await cropAndResize(img, preset.width, preset.height);
      }

      if (!blob) throw new Error("Failed to process image");

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}${preset.width ? `-${preset.width}x${preset.height}` : ""}.png`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to process image. Downloading original.");
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${filename}.png`;
      link.click();
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
        <Download className={variant === "gold" ? "w-4 h-4" : "w-4 h-4"} />
        {variant === "gold" && (
          <>
            {processing ? "Processing..." : "Download"}
            <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
          </>
        )}
      </button>

      {open && (
        <div className="absolute bottom-full mb-2 right-0 z-50 min-w-[220px] rounded-xl border border-white/[0.08] bg-background/95 backdrop-blur-lg shadow-dramatic overflow-hidden">
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
