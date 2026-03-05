import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Image as ImageIcon, X, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

interface RoomUploaderProps {
  onResult: (original: string, staged: string) => void;
  initialImage?: string | null;
  initialRoomType?: string;
  initialStyle?: string;
  canStage: boolean;
  onStagingComplete: () => void;
  usage: { plan: string; stagings_this_month: number } | null;
  freeLimit: number;
}

const RoomUploader = ({
  onResult,
  initialImage,
  initialRoomType,
  initialStyle,
  canStage,
  onStagingComplete,
  usage,
  freeLimit,
}: RoomUploaderProps) => {
  const [image, setImage] = useState<string | null>(initialImage || null);
  const [roomType, setRoomType] = useState(initialRoomType || "Living Room");
  const [style, setStyle] = useState(initialStyle || "Modern");
  const [propertyName, setPropertyName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialImage) setImage(initialImage);
    if (initialRoomType) setRoomType(initialRoomType);
    if (initialStyle) setStyle(initialStyle);
  }, [initialImage, initialRoomType, initialStyle]);

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

  const handleStage = async () => {
    if (!image) return;

    if (!canStage) {
      toast.error("You've reached your free staging limit this month.");
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("stage-room", {
        body: { image, roomType, style },
      });

      if (error) throw error;

      if (data?.stagedImageUrl) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("stagings").insert({
            user_id: user.id,
            original_image_url: image,
            staged_image_url: data.stagedImageUrl,
            room_type: roomType,
            style: style,
            property_address: propertyName.trim() || null,
          });
        }
        onStagingComplete();
        onResult(image, data.stagedImageUrl);
        toast.success("Room staged successfully!");
      } else {
        throw new Error("No staged image returned");
      }
    } catch (err: any) {
      console.error("Staging error:", err);
      toast.error(err.message || "Failed to stage room. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const limitReached = usage && usage.plan === "free" && !canStage;

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

                {/* Options */}
                <div className="grid md:grid-cols-2 gap-8 mb-10">
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
                  <div>
                    <label className="font-body text-sm font-medium text-muted-foreground block mb-3">
                      Design Style
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {STYLES.map((s) => (
                        <button
                          key={s}
                          onClick={() => setStyle(s)}
                          className={`font-body text-sm px-4 py-2 rounded-lg border transition-all ${
                            style === s
                              ? "border-accent/30 bg-accent/[0.08] text-accent"
                              : "border-border text-muted-foreground hover:border-accent/40"
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Limit reached or stage button */}
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
                        Staging your room with AI...
                      </span>
                    ) : (
                      "Stage This Room"
                    )}
                  </motion.button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
};

export default RoomUploader;
