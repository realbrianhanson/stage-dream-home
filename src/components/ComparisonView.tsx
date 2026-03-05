import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Check } from "lucide-react";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import type { StagingResult } from "@/components/RoomUploader";

interface ComparisonViewProps {
  original: string;
  results: StagingResult[];
  onReset: () => void;
}

const ComparisonView = ({ original, results, onReset }: ComparisonViewProps) => {
  const [selectedResult, setSelectedResult] = useState<StagingResult | null>(null);

  const handleDownload = (result: StagingResult) => {
    const link = document.createElement("a");
    link.href = result.stagedImageUrl;
    link.download = `staged-${result.style.toLowerCase().replace(/\s+/g, "-")}.png`;
    link.click();
  };

  return (
    <div className="pt-24 pb-16 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-accent font-body text-xs tracking-[0.3em] uppercase mb-3">
            Style Comparison
          </p>
          <h2 className="font-display text-3xl md:text-4xl font-medium mb-2">
            Compare {results.length} Styles
          </h2>
          <p className="font-body text-sm text-muted-foreground">
            Click any card to view the before & after slider
          </p>
        </motion.div>

        {/* Original image — compact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-xs mx-auto mb-10"
        >
          <div className="relative rounded-xl overflow-hidden border border-white/[0.06]">
            <img
              src={original}
              alt="Original room"
              className="w-full h-40 object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-foreground/60 text-primary-foreground rounded-md px-2.5 py-1 text-xs font-body">
              Before
            </div>
          </div>
        </motion.div>

        {/* Results row */}
        <div className="overflow-x-auto pb-4 -mx-6 px-6">
          <div className="flex gap-5 min-w-min">
            {results.map((result, i) => (
              <motion.div
                key={result.style}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.1 }}
                className="group w-[320px] flex-shrink-0 rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-accent/20 hover:shadow-dramatic hover:-translate-y-1 transition-all duration-500 cursor-pointer"
                onClick={() => setSelectedResult(result)}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={result.stagedImageUrl}
                    alt={`Staged — ${result.style}`}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="inline-block w-1 h-1 rounded-full bg-accent" />
                      <p className="font-body text-[10px] tracking-[0.2em] uppercase text-accent">
                        After
                      </p>
                    </div>
                    <p className="font-display text-xl text-primary-foreground font-medium">
                      {result.style}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedResult(result);
                    }}
                    className="flex-1 font-body text-xs font-semibold py-2.5 rounded-lg border border-accent/20 bg-accent/[0.06] text-accent hover:bg-accent/[0.12] transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Compare
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(result);
                    }}
                    className="w-10 h-10 rounded-lg border border-white/[0.06] text-muted-foreground hover:text-accent hover:border-accent/20 flex items-center justify-center transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Back button */}
        <div className="text-center mt-10">
          <button
            onClick={onReset}
            className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Stage another room
          </button>
        </div>
      </div>

      {/* Full-screen Before/After modal */}
      <AnimatePresence>
        {selectedResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/80 backdrop-blur-md overflow-y-auto"
          >
            <button
              onClick={() => setSelectedResult(null)}
              className="fixed top-6 right-6 z-50 w-10 h-10 rounded-full bg-foreground/60 hover:bg-foreground/80 text-primary-foreground flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="fixed top-6 left-6 z-50">
              <span className="font-display text-sm text-primary-foreground/60">
                {selectedResult.style}
              </span>
            </div>
            <BeforeAfterSlider
              before={original}
              after={selectedResult.stagedImageUrl}
              onReset={() => setSelectedResult(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ComparisonView;
