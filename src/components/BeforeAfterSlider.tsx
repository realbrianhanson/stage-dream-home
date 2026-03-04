import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";

interface BeforeAfterSliderProps {
  before: string;
  after: string;
  onReset: () => void;
}

const BeforeAfterSlider = ({ before, after, onReset }: BeforeAfterSliderProps) => {
  const [sliderPos, setSliderPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

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
  const handleTouchMove = (e: React.TouchEvent) => {
    updateSlider(e.touches[0].clientX);
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = after;
    link.download = "staged-room.png";
    link.click();
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
          className="relative rounded-2xl overflow-hidden shadow-elevated cursor-col-resize select-none"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          style={{ aspectRatio: "16/10" }}
        >
          {/* After (full) */}
          <img src={after} alt="Staged room" className="absolute inset-0 w-full h-full object-cover" />
          
          {/* Before (clipped) */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ width: `${sliderPos}%` }}
          >
            <img
              src={before}
              alt="Original room"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ width: `${containerRef.current?.offsetWidth || 0}px`, maxWidth: "none" }}
            />
          </div>

          {/* Slider handle */}
          <div
            className="absolute top-0 bottom-0 z-10"
            style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
          >
            <div className="w-0.5 h-full bg-primary-foreground/80" />
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-primary-foreground shadow-elevated flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" className="text-foreground">
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
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleDownload}
            className="gold-gradient text-accent-foreground font-body font-semibold text-sm px-8 py-3 rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Staged Photo
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onReset}
            className="border border-border font-body font-semibold text-sm px-8 py-3 rounded-lg text-muted-foreground hover:border-accent/40 transition-colors"
          >
            Stage Another Room
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default BeforeAfterSlider;
