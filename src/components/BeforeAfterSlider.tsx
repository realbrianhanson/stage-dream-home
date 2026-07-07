import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { toast } from "sonner";
import DownloadWithPresets from "@/components/DownloadWithPresets";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

interface BeforeAfterSliderProps {
  before: string;
  after: string;
  onReset?: () => void;
  isWatermarked?: boolean;
  mlsDisclosure?: boolean;
}

const BeforeAfterSlider = ({ before, after, onReset, isWatermarked, mlsDisclosure }: BeforeAfterSliderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sliderPos, setSliderPos] = useState(50);
  const [containerWidth, setContainerWidth] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Load the after image to determine natural aspect ratio.
  useEffect(() => {
    if (!after) return;
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
    img.src = after;
  }, [after]);

  const updateSlider = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPos((x / rect.width) * 100);
  }, []);

  const handleMouseDown = () => { isDragging.current = true; };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging.current) updateSlider(e.clientX);
  };
  const handleHandleTouchStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    // Prevent page scroll while dragging the handle.
    e.preventDefault();
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    updateSlider(e.touches[0].clientX);
  };
  const handleCopyToClipboard = async () => {
    try {
      const response = await fetch(after);
      const blob = await response.blob();
      const pngBlob = blob.type === "image/png" ? blob : await convertToPngBlob(blob);
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      setCopied(true);
      toast.success("Image copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Clipboard not available in this browser — use Download instead");
      // Auto-trigger download as fallback via blob URL (cross-origin safe)
      try {
        const res = await fetch(after);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "staged-room.jpg";
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch {
        toast.error("Download failed. Please try again.");
      }
    }
  };

  const convertToPngBlob = (blob: Blob): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("PNG conversion failed"))), "image/png");
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image load failed"));
      };
      img.src = objectUrl;
    });
  };


  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-accent font-body text-sm tracking-[0.3em] uppercase mb-4">
            Result
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-medium mb-4">
            Before & After
          </h2>
          <p className="font-body text-muted-foreground">
            Drag the slider to compare the original and staged room
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden shadow-elevated border border-white/[0.06] cursor-col-resize select-none mx-auto"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          onTouchCancel={handleMouseUp}
          style={{
            aspectRatio: aspectRatio ? `${aspectRatio}` : "16 / 10",
            maxHeight: "70vh",
            width: aspectRatio ? `min(100%, calc(70vh * ${aspectRatio}))` : "100%",
          }}
        >
          {/* After (full) */}
          <img src={after} alt="Staged room" className="absolute inset-0 w-full h-full object-cover" />

          {/* Watermark overlay */}
          {isWatermarked && (
            <div className="absolute bottom-4 right-4 z-[5] bg-foreground/40 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="font-body text-xs text-primary-foreground/40 select-none">RealVision</span>
            </div>
          )}

          {/* Before (clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPos}%` }}
          >
            <img
              src={before}
              alt="Original room"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ width: `${containerWidth}px`, maxWidth: "none" }}
            />
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 z-10 touch-none"
            style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleHandleTouchStart}
          >
            <div className="w-0.5 h-full bg-primary-foreground/80" />
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(38 55% 45%), hsl(40 70% 62%))', boxShadow: '0 4px 20px hsl(38 60% 55% / 0.3)' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" className="text-accent-foreground">
                <path d="M5 3L2 8L5 13" stroke="currentColor" strokeWidth="1.5" fill="none" />
                <path d="M11 3L14 8L11 13" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </div>
          </div>

          {/* Labels */}
          <div className="absolute top-4 left-4 bg-foreground/60 text-primary-foreground rounded-lg px-3 py-1.5 text-xs font-body font-medium">
            Before
          </div>
          <div className="absolute top-4 right-4 bg-accent/90 text-accent-foreground rounded-lg px-3 py-1.5 text-xs font-body font-medium">
            After
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex justify-center gap-4 mt-8">
          <DownloadWithPresets imageUrl={after} filename="staged-room" variant="gold" isWatermarked={isWatermarked} mlsDisclosure={mlsDisclosure} />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCopyToClipboard}
            className="border border-border font-body font-semibold text-sm px-8 py-3 rounded-lg text-muted-foreground hover:border-accent/30 hover:text-accent transition-colors flex items-center gap-2"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy to Clipboard"}
          </motion.button>
          {onReset && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onReset}
              className="border border-border font-body font-semibold text-sm px-8 py-3 rounded-lg text-muted-foreground hover:border-accent/30 hover:text-accent transition-colors"
            >
              Stage Another Room
            </motion.button>
          )}
        </div>

        {/* Upgrade nudge for free users */}
        {isWatermarked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-center mt-6"
          >
            <p className="font-body text-sm text-muted-foreground">
              Free images include a small watermark.{" "}
              <button
                onClick={() => navigate("/pricing")}
                className="text-accent hover:underline transition-colors"
              >
                Upgrade to Pro
              </button>{" "}
              for clean, watermark-free exports.
            </p>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default BeforeAfterSlider;
