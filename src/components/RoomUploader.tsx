import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, X, Loader2, Lock, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, StopCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadStagingImage } from "@/lib/uploadStagingImage";

const INSTRUCTION_CHIPS = [
  "Pet-friendly furniture",
  "Family-oriented",
  "Warm earth tones",
  "Bright and airy",
  "Home office area",
  "Large area rug",
  "Statement lighting",
  "Indoor plants",
];

const MAX_INSTRUCTIONS = 300;

const ROOM_TYPES = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Dining Room",
  "Bathroom",
  "Home Office",
];

const STYLES = [
  "Modern",
  "Traditional",
  "Minimalist",
  "Scandinavian",
  "Mid-Century",
  "Luxury",
];

const ASPECT_RATIOS = [
  { value: "", label: "Match Photo" },
  { value: "16:9", label: "Wide 16:9" },
  { value: "4:3", label: "Standard 4:3" },
  { value: "3:4", label: "Portrait 3:4" },
  { value: "1:1", label: "Square 1:1" },
];

export interface StagingResult {
  style: string;
  stagedImageUrl: string;
  isWatermarked?: boolean;
}

interface RoomUploaderProps {
  onResult: (original: string, staged: string, isWatermarked?: boolean) => void;
  onMultiResult: (original: string, results: StagingResult[], isWatermarked?: boolean) => void;
  onMultiStart: (original: string, pendingStyles: string[]) => void;
  onMultiProgress: (result: StagingResult, remainingStyles: string[]) => void;
  initialImage?: string | null;
  initialRoomType?: string;
  initialStyle?: string;
  initialCustomInstructions?: string;
  canStage: boolean;
  remainingStagings: number;
  onStagingComplete: () => Promise<boolean>;
  usage: { plan: string; stagings_this_month: number } | null;
  freeLimit: number;
}

const RoomUploader = ({
  onResult,
  onMultiResult,
  onMultiStart,
  onMultiProgress,
  initialImage,
  initialRoomType,
  initialStyle,
  initialCustomInstructions,
  canStage,
  remainingStagings,
  onStagingComplete,
  usage,
  freeLimit,
}: RoomUploaderProps) => {
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [mode, setMode] = useState<"stage" | "remove">("stage");
  const [roomType, setRoomType] = useState(initialRoomType || "Living Room");
  const [style, setStyle] = useState(initialStyle || "Modern");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([initialStyle || "Modern"]);
  const [compareMode, setCompareMode] = useState(false);
  const [propertyName, setPropertyName] = useState("");
  const [customInstructions, setCustomInstructions] = useState(initialCustomInstructions || "");
  const [aspectRatio, setAspectRatio] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (initialImage) setImage(initialImage);
    if (initialRoomType) setRoomType(initialRoomType);
    if (initialStyle) {
      setStyle(initialStyle);
      setSelectedStyles([initialStyle]);
    }
    if (initialCustomInstructions) {
      setCustomInstructions(initialCustomInstructions);
      setShowAdvanced(true);
    }
  }, [initialImage, initialRoomType, initialStyle, initialCustomInstructions]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image must be under 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const toggleStyleSelection = (s: string) => {
    setSelectedStyles((prev) => {
      if (prev.includes(s)) {
        return prev.length > 1 ? prev.filter((x) => x !== s) : prev;
      }
      if (prev.length >= 3) {
        toast.error("Maximum 3 styles for comparison");
        return prev;
      }
      return [...prev, s];
    });
  };

  const handleCancel = () => {
    cancelledRef.current = true;
    toast.info("Cancelling remaining styles...");
  };

  const handleStage = async () => {
    if (!image) return;

    const isRemove = mode === "remove";
    const stylesToStage = isRemove ? ["Removed"] : (compareMode ? selectedStyles : [style]);
    const count = stylesToStage.length;

    if (!canStage) {
      toast.error("You've reached your free staging limit this month.");
      return;
    }

    setIsProcessing(true);
    cancelledRef.current = false;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (count === 1) {
        // Atomic check-and-increment before staging
        const allowed = await onStagingComplete();
        if (!allowed) {
          toast.error("You've reached your free staging limit this month.");
          setIsProcessing(false);
          return;
        }

        setProgressText(isRemove ? "Removing furniture from your room..." : "Staging your room with AI...");
        const instrTrimmed = customInstructions.trim().slice(0, MAX_INSTRUCTIONS);
        const { data, error } = await supabase.functions.invoke("stage-room", {
          body: { image, roomType, style: stylesToStage[0], customInstructions: instrTrimmed, aspectRatio: aspectRatio || undefined, mode: isRemove ? "remove" : "stage" },
        });
        if (error) throw error;
        if (!data?.stagedImageUrl) throw new Error("No staged image returned");

        if (user) {
          const stagingId = crypto.randomUUID();
          const [originalUrl, stagedUrl] = await Promise.all([
            uploadStagingImage(user.id, stagingId, image, "original"),
            uploadStagingImage(user.id, stagingId, data.stagedImageUrl, "staged"),
          ]);

          await supabase.from("stagings").insert({
            id: stagingId,
            user_id: user.id,
            original_image_url: originalUrl,
            staged_image_url: stagedUrl,
            room_type: roomType,
            style: stylesToStage[0],
            property_address: propertyName.trim() || null,
            custom_instructions: instrTrimmed || null,
            aspect_ratio: aspectRatio || null,
          } as any);
          onResult(originalUrl, stagedUrl, data.isWatermarked);
        } else {
          onResult(image, data.stagedImageUrl, data.isWatermarked);
        }
        toast.success(isRemove ? "Furniture removed successfully!" : "Room staged successfully!");
      } else {
        // Multi-style — progressive streaming
        onMultiStart(image, [...stylesToStage]);

        const completedResults: StagingResult[] = [];

        // Upload original image once and reuse URL
        let sharedOriginalUrl: string | null = null;
        if (user) {
          const firstStagingId = crypto.randomUUID();
          sharedOriginalUrl = await uploadStagingImage(user.id, firstStagingId, image, "original");
        }

        for (let i = 0; i < stylesToStage.length; i++) {
          if (cancelledRef.current) {
            toast.info(`Cancelled — ${completedResults.length} of ${count} styles completed`);
            break;
          }

          // Atomic check-and-increment before each style
          const allowed = await onStagingComplete();
          if (!allowed) {
            toast.info(`Limit reached after ${completedResults.length} style${completedResults.length !== 1 ? "s" : ""}. Upgrade for more.`);
            break;
          }

          const currentStyle = stylesToStage[i];
          const remaining = stylesToStage.slice(i + 1);
          setProgressText(`Staging ${i + 1} of ${count}... ${currentStyle}`);

          try {
            const instrTrimmed = customInstructions.trim().slice(0, MAX_INSTRUCTIONS);
            const { data, error } = await supabase.functions.invoke("stage-room", {
              body: { image, roomType, style: currentStyle, customInstructions: instrTrimmed, aspectRatio: aspectRatio || undefined },
            });
            if (error) throw error;
            if (!data?.stagedImageUrl) throw new Error(`No staged image returned for ${currentStyle}`);

            let finalResult: StagingResult = { style: currentStyle, stagedImageUrl: data.stagedImageUrl, isWatermarked: data.isWatermarked };

            // Upload staged image and save to db (reuse shared original)
            if (user && sharedOriginalUrl) {
              const stagingId = crypto.randomUUID();
              const stagedUrl = await uploadStagingImage(user.id, stagingId, data.stagedImageUrl, "staged");

              await supabase.from("stagings").insert({
                id: stagingId,
                user_id: user.id,
                original_image_url: sharedOriginalUrl,
                staged_image_url: stagedUrl,
                room_type: roomType,
                style: currentStyle,
                property_address: propertyName.trim() || null,
                custom_instructions: instrTrimmed || null,
                aspect_ratio: aspectRatio || null,
              } as any);

              finalResult.stagedImageUrl = stagedUrl;
            }

            completedResults.push(finalResult);
            onMultiProgress(finalResult, cancelledRef.current ? [] : remaining);
          } catch (styleErr: any) {
            console.error(`Style "${currentStyle}" failed:`, styleErr);
            toast.error(`Failed to stage "${currentStyle}" — skipping`);
            onMultiProgress(
              { style: currentStyle, stagedImageUrl: "", isWatermarked: false },
              cancelledRef.current ? [] : remaining
            );
          }
        }

        toast.success(
          cancelledRef.current
            ? `${completedResults.length} style${completedResults.length !== 1 ? "s" : ""} staged`
            : `Room staged in ${count} styles!`
        );
      }
    } catch (err: any) {
      console.error("Staging error:", err);
      toast.error(err.message || "Failed to stage room. Please try again.");
    } finally {
      setIsProcessing(false);
      setProgressText("");
      cancelledRef.current = false;
    }
  };

  const limitReached = usage && usage.plan === "free" && !canStage;
  const activeStyleCount = compareMode ? selectedStyles.length : 1;

  return (
    <section id="upload-section" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <p className="text-accent font-body text-sm tracking-[0.3em] uppercase mb-4">
            Get Started
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-medium mb-4">
            Upload Your Room
          </h2>
          <p className="font-body text-muted-foreground max-w-lg mx-auto">
            Drop a photo of your vacant room and choose your preferred style.
            Our AI will do the rest.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <AnimatePresence mode="wait">
            {!image ? (
              <motion.div
                key="dropzone"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all duration-300 ${
                  dragOver
                    ? "border-accent/40 bg-accent/[0.04]"
                    : "border-white/[0.08] hover:border-accent/30 bg-white/[0.02] backdrop-blur-sm"
                }`}
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="font-display text-xl mb-2">
                  Drop your room photo here
                </p>
                <p className="font-body text-sm text-muted-foreground">
                  or click to browse · JPG, PNG up to 10MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="relative rounded-2xl overflow-hidden shadow-elevated mb-8">
                  <img
                    src={image}
                    alt="Uploaded vacant room"
                    className="w-full h-80 object-cover"
                  />
                  <button
                    onClick={() => setImage(null)}
                    className="absolute top-4 right-4 bg-foreground/60 hover:bg-foreground/80 text-primary-foreground rounded-full p-2 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-foreground/60 text-primary-foreground rounded-lg px-3 py-1.5 text-sm font-body">
                    <ImageIcon className="w-4 h-4" />
                    Original Photo
                  </div>
                </div>

                {/* Property name input */}
                <div className="mb-8">
                  <label className="font-body text-sm font-medium text-muted-foreground block mb-2">
                    Property Name (optional)
                  </label>
                  <input
                    type="text"
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="e.g., 123 Oak Street or Lakeside Condo"
                    className="w-full font-body text-sm bg-white/[0.02] border border-white/[0.08] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>

                {/* Mode toggle: Stage vs Remove */}
                <div className="mb-8">
                  <label className="font-body text-sm font-medium text-muted-foreground block mb-3">
                    What do you want to do?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setMode("stage")}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        mode === "stage"
                          ? "border-accent/40 bg-accent/[0.08]"
                          : "border-border hover:border-accent/30"
                      }`}
                    >
                      <p className={`font-display text-base font-medium mb-1 ${mode === "stage" ? "text-accent" : ""}`}>
                        Add Furniture
                      </p>
                      <p className="font-body text-xs text-muted-foreground leading-snug">
                        Stage an empty room with beautiful furniture & decor
                      </p>
                    </button>
                    <button
                      onClick={() => {
                        setMode("remove");
                        setCompareMode(false);
                      }}
                      className={`text-left p-4 rounded-xl border transition-all ${
                        mode === "remove"
                          ? "border-accent/40 bg-accent/[0.08]"
                          : "border-border hover:border-accent/30"
                      }`}
                    >
                      <p className={`font-display text-base font-medium mb-1 ${mode === "remove" ? "text-accent" : ""}`}>
                        Remove Furniture
                      </p>
                      <p className="font-body text-xs text-muted-foreground leading-snug">
                        De-stage a furnished room — show it empty
                      </p>
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className={`grid ${mode === "stage" ? "md:grid-cols-2" : "grid-cols-1"} gap-8 mb-6`}>
                  <div>
                    <label className="font-body text-sm font-medium text-muted-foreground block mb-3">
                      Room Type
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {ROOM_TYPES.map((type) => (
                        <button
                          key={type}
                          onClick={() => setRoomType(type)}
                          className={`font-body text-sm px-4 py-2 rounded-lg border transition-all ${
                            roomType === type
                              ? "border-accent/30 bg-accent/[0.08] text-accent"
                              : "border-border text-muted-foreground hover:border-accent/40"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  {mode === "stage" && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="font-body text-sm font-medium text-muted-foreground">
                          Design Style
                        </label>
                        <button
                          onClick={() => {
                            setCompareMode(!compareMode);
                            if (!compareMode) {
                              setSelectedStyles([style]);
                            }
                          }}
                          className="flex items-center gap-1.5 font-body text-xs text-muted-foreground hover:text-accent transition-colors"
                        >
                          {compareMode ? (
                            <ToggleRight className="w-4 h-4 text-accent" />
                          ) : (
                            <ToggleLeft className="w-4 h-4" />
                          )}
                          Compare styles
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {STYLES.map((s) => {
                          const isSelected = compareMode
                            ? selectedStyles.includes(s)
                            : style === s;
                          return (
                            <button
                              key={s}
                              onClick={() => {
                                if (compareMode) {
                                  toggleStyleSelection(s);
                                } else {
                                  setStyle(s);
                                }
                              }}
                              className={`font-body text-sm px-4 py-2 rounded-lg border transition-all ${
                                isSelected
                                  ? "border-accent/30 bg-accent/[0.08] text-accent"
                                  : "border-border text-muted-foreground hover:border-accent/40"
                              }`}
                            >
                              {s}
                            </button>
                          );
                        })}
                      </div>
                      {compareMode && (
                        <p className="font-body text-[11px] text-muted-foreground/60 mt-2">
                          Select 2–3 styles · Each counts as one staging
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Output Aspect Ratio */}
                <div className="mb-6">
                  <label className="font-body text-sm font-medium text-muted-foreground block mb-3">
                    Output Shape
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar.value}
                        onClick={() => setAspectRatio(ar.value)}
                        className={`font-body text-sm px-4 py-2 rounded-lg border transition-all ${
                          aspectRatio === ar.value
                            ? "border-accent/30 bg-accent/[0.08] text-accent"
                            : "border-border text-muted-foreground hover:border-accent/40"
                        }`}
                      >
                        {ar.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced Options */}
                <div className="mb-6">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Advanced Options
                    {showAdvanced ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4">
                          <label className="font-body text-sm font-medium text-muted-foreground block mb-2">
                            Custom Instructions (optional)
                          </label>
                          <textarea
                            value={customInstructions}
                            onChange={(e) => {
                              if (e.target.value.length <= MAX_INSTRUCTIONS) {
                                setCustomInstructions(e.target.value);
                              }
                            }}
                            placeholder="e.g., Add a fireplace, use warm earth tones, include a large area rug, keep it pet-friendly with durable furniture..."
                            rows={3}
                            className="w-full font-body text-sm bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-muted-foreground/50 resize-none"
                          />
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex flex-wrap gap-1.5">
                              {INSTRUCTION_CHIPS.map((chip) => (
                                <button
                                  key={chip}
                                  onClick={() => {
                                    const separator = customInstructions.trim() ? ", " : "";
                                    const newVal = customInstructions.trim() + separator + chip;
                                    if (newVal.length <= MAX_INSTRUCTIONS) {
                                      setCustomInstructions(newVal);
                                    }
                                  }}
                                  className="border border-white/[0.06] hover:border-accent/25 px-3 py-1.5 rounded-full text-xs font-body text-muted-foreground hover:text-accent transition-all"
                                >
                                  {chip}
                                </button>
                              ))}
                            </div>
                            <span className={`font-body text-[11px] flex-shrink-0 ml-3 ${customInstructions.length > MAX_INSTRUCTIONS * 0.9 ? "text-destructive" : "text-muted-foreground/50"}`}>
                              {customInstructions.length}/{MAX_INSTRUCTIONS}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Limit reached or stage button */}
                <div className="mt-10">
                  {limitReached ? (
                    <div className="text-center py-6 border border-white/[0.06] rounded-2xl bg-white/[0.02]">
                      <Lock className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                      <p className="font-display text-lg font-medium mb-1">
                        You've used all {freeLimit} free stagings this month
                      </p>
                      <p className="font-body text-sm text-muted-foreground mb-5">
                        Upgrade for unlimited AI-powered virtual staging
                      </p>
                      <a
                        href="/#pricing"
                        className="inline-block gold-gradient-animated text-accent-foreground font-body font-semibold text-sm px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
                      >
                        Upgrade to Pro — Unlimited Stagings
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleStage}
                        disabled={isProcessing}
                        className="w-full gold-gradient-animated text-accent-foreground font-body font-semibold text-base py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        {isProcessing ? (
                          <span className="flex items-center justify-center gap-3">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {progressText || "Staging your room with AI..."}
                          </span>
                        ) : compareMode && selectedStyles.length > 1 ? (
                          `Stage in ${selectedStyles.length} Styles`
                        ) : (
                          "Stage This Room"
                        )}
                      </motion.button>

                      {/* Cancel button during multi-style processing */}
                      {isProcessing && compareMode && selectedStyles.length > 1 && (
                        <motion.button
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={handleCancel}
                          disabled={cancelledRef.current}
                          className="w-full border border-border font-body text-sm py-3 rounded-lg text-muted-foreground hover:border-destructive/30 hover:text-destructive transition-colors flex items-center justify-center gap-2"
                        >
                          <StopCircle className="w-4 h-4" />
                          Cancel Remaining Styles
                        </motion.button>
                      )}

                      {/* Time estimate for multi-style */}
                      {compareMode && selectedStyles.length > 1 && !isProcessing && (
                        <p className="font-body text-xs text-muted-foreground/50 text-center">
                          Comparing {selectedStyles.length} styles takes about {selectedStyles.length * 10}–{selectedStyles.length * 15} seconds total
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default RoomUploader;