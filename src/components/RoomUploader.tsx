import { useState, useCallback, useRef, useEffect } from "react";
import { Upload, Loader2, Lock, RotateCcw, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { stageRoom, uploadOriginal, StagingError, type StageParams } from "@/lib/stagingApi";
import { prepareImage } from "@/lib/prepareImage";
import { getPalettesForStyle } from "@/config/catalogs";
import { toolInfo, type ToolId } from "@/config/tools";
import { useAuth } from "@/hooks/useAuth";
import { useRoomDetection } from "@/hooks/useRoomDetection";
import BatchStaging from "@/components/BatchStaging";
import ToolPicker from "@/components/studio/ToolPicker";
import StudioOptions, { MAX_INSTRUCTIONS, type StudioState } from "@/components/studio/StudioOptions";

// Admin-only: pick the image model to A/B results. "Auto" uses the server's chain.
const ADMIN_MODELS = [
  { value: "", label: "Auto (best available)" },
  { value: "openai/gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst" },
  { value: "openai/gpt-image-2.5-flare", label: "GPT Image 2.5 Flare (fast)" },
  { value: "openai/gpt-image-2", label: "GPT Image 2" },
  { value: "google/gemini-3-pro-image", label: "Gemini 3 Pro Image" },
  { value: "google/gemini-2.5-flash-image", label: "Gemini 2.5 Flash Image (old)" },
];

export interface StagingMeta {
  stagingId: string;
  tool?: ToolId;
  roomType: string;
  style: string;
  propertyName: string;
  customInstructions: string;
  palette?: string;
}

export interface StagingResult {
  style: string;
  stagedImageUrl: string;
  stagingId?: string;
  isWatermarked?: boolean;
  mlsDisclosure?: boolean;
}

interface RoomUploaderProps {
  onResult: (original: string, staged: string, isWatermarked?: boolean, mlsDisclosure?: boolean, meta?: StagingMeta) => void;
  onMultiStart: (original: string, pendingStyles: string[]) => void;
  onMultiProgress: (result: StagingResult, remainingStyles: string[]) => void;
  initialImage?: string | null;
  initialRoomType?: string;
  initialStyle?: string;
  initialCustomInstructions?: string;
  initialPalette?: string;
  canStage: boolean;
  remainingStagings: number;
  onStagingComplete: () => Promise<void>;
  usage: { plan: string; stagings_this_month: number } | null;
  freeLimit: number;
}

const RoomUploader = ({
  onResult,
  onMultiStart,
  onMultiProgress,
  initialImage,
  initialRoomType,
  initialStyle,
  initialCustomInstructions,
  initialPalette,
  canStage,
  remainingStagings,
  onStagingComplete,
  usage,
  freeLimit,
}: RoomUploaderProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isFree = !usage || usage.plan === "free";
  const isAdmin = usage?.plan === "admin";

  const [image, setImage] = useState<string | null>(initialImage || null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(initialImage?.startsWith("http") ? initialImage : null);
  const uploadRef = useRef<Promise<string> | null>(null);
  const [batchFiles, setBatchFiles] = useState<File[] | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressText, setProgressText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelledRef = useRef(false);
  const touchedRef = useRef({ tool: false, room: false });

  const [state, setState] = useState<StudioState>({
    tool: "stage",
    roomType: initialRoomType || "Living Room",
    style: initialStyle || "Modern",
    compare: false,
    compareStyles: [initialStyle || "Modern"],
    variations: 1,
    recolorTarget: "walls",
    finish: "",
    aspectRatio: "",
    propertyName: "",
    mlsDisclosure: false,
    instructions: initialCustomInstructions || "",
    palette: initialPalette || "",
    model: "",
  });
  const set = useCallback(<K extends keyof StudioState>(key: K, value: StudioState[K]) => {
    if (key === "tool") touchedRef.current.tool = true;
    if (key === "roomType") touchedRef.current.room = true;
    setState((s) => {
      const next = { ...s, [key]: value };
      // A palette only makes sense for the style it belongs to.
      if (key === "style" && next.palette && !getPalettesForStyle(String(value)).includes(next.palette)) next.palette = "";
      return next;
    });
  }, []);

  const { detection, detecting } = useRoomDetection(originalUrl);

  // Pre-fill from detection unless the user already chose.
  useEffect(() => {
    if (!detection) return;
    setState((s) => ({
      ...s,
      roomType: !touchedRef.current.room && detection.roomType ? detection.roomType : s.roomType,
      tool: !touchedRef.current.tool ? detection.suggestedTool : s.tool,
    }));
  }, [detection]);

  useEffect(() => {
    if (!initialImage) return;
    setImage(initialImage);
    if (initialImage.startsWith("http")) setOriginalUrl(initialImage);
  }, [initialImage]);

  const startUpload = useCallback(
    (dataUrl: string) => {
      if (!user) return;
      const p = uploadOriginal(user.id, dataUrl);
      uploadRef.current = p;
      p.then((url) => {
        if (uploadRef.current === p) setOriginalUrl(url);
      }).catch((err) => console.error("Original upload failed:", err));
    },
    [user],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      const imgs = files.filter((f) => f.type.startsWith("image/"));
      if (imgs.length === 0) return toast.error("Please choose photos (JPG, PNG or WebP).");
      if (imgs.length >= 2) return setBatchFiles(imgs.slice(0, 15));
      try {
        const dataUrl = await prepareImage(imgs[0]);
        touchedRef.current = { tool: false, room: false };
        setOriginalUrl(null);
        setImage(dataUrl);
        startUpload(dataUrl);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "That photo couldn't be opened.");
      }
    },
    [startUpload],
  );

  const resetPhoto = () => {
    uploadRef.current = null;
    setImage(null);
    setOriginalUrl(null);
  };

  const ensureOriginal = async (): Promise<string> => {
    if (originalUrl) return originalUrl;
    if (uploadRef.current) return uploadRef.current;
    if (!user || !image) throw new Error("Please sign in again.");
    return uploadOriginal(user.id, image);
  };

  const tool = toolInfo(state.tool);
  const isStage = state.tool === "stage";
  const compareRun = isStage && state.compare && state.compareStyles.length > 1;
  const runCount = compareRun ? state.compareStyles.length : isStage && !isFree ? state.variations : 1;
  const maxCompare = isFree ? 3 : 6;
  const limitReached = !!usage && !canStage;
  const notEnough = runCount > remainingStagings;

  const handleStage = async () => {
    if (!image || !user) return;
    if (state.tool === "recolor" && !state.finish.trim()) return toast.error("Describe the new color or material.");
    if (notEnough) return toast.error(`That needs ${runCount} stagings and you have ${remainingStagings} left this month.`);

    setIsProcessing(true);
    cancelledRef.current = false;
    const instructions = state.instructions.trim().slice(0, MAX_INSTRUCTIONS);
    const base: Omit<StageParams, "style"> = {
      mode: state.tool,
      roomType: tool.exterior ? "Outdoor / Patio" : state.roomType,
      customInstructions: isStage ? instructions : undefined,
      aspectRatio: isStage ? state.aspectRatio || undefined : undefined,
      mlsDisclosure: state.mlsDisclosure && tool.disclose,
      propertyName: state.propertyName.trim() || undefined,
      recolorTarget: state.recolorTarget,
      finish: state.finish.trim(),
      model: isAdmin ? state.model || undefined : undefined,
    };

    try {
      setProgressText("Uploading your photo…");
      const url = await ensureOriginal();

      if (compareRun) {
        await runCompare(url, base);
        return;
      }

      setProgressText(progressFor(state.tool, runCount));
      const result = await stageRoom({ ...base, originalUrl: url, style: state.style, palette: isStage ? state.palette : undefined, variations: runCount });

      if (result.stagings.length > 1) {
        const labels = result.stagings.map((_, i) => `Option ${i + 1}`);
        onMultiStart(url, labels);
        result.stagings.forEach((row, i) =>
          onMultiProgress(
            { style: labels[i], stagedImageUrl: row.staged_image_url, stagingId: row.id, isWatermarked: result.isWatermarked, mlsDisclosure: row.mls_disclosure },
            [],
          ),
        );
      } else {
        const row = result.stagings[0];
        onResult(url, row.staged_image_url, result.isWatermarked, row.mls_disclosure, {
          stagingId: row.id,
          tool: state.tool,
          roomType: row.room_type,
          style: row.style,
          propertyName: state.propertyName.trim(),
          customInstructions: instructions,
          palette: isStage ? state.palette : "",
        });
      }
      toast.success(doneMessage(state.tool, result.stagings.length));
    } catch (err) {
      console.error("Staging error:", err);
      toast.error(err instanceof Error ? err.message : "That didn't work. Please try again.");
    } finally {
      await onStagingComplete();
      setIsProcessing(false);
      setProgressText("");
      cancelledRef.current = false;
    }
  };

  const runCompare = async (url: string, base: Omit<StageParams, "style">) => {
    const styles = state.compareStyles;
    onMultiStart(url, [...styles]);
    let done = 0;
    for (let i = 0; i < styles.length; i++) {
      if (cancelledRef.current) {
        toast.info(`Stopped after ${done} of ${styles.length} styles`);
        onMultiProgress({ style: styles[i], stagedImageUrl: "" }, []);
        break;
      }
      const style = styles[i];
      const remaining = styles.slice(i + 1);
      setProgressText(`Staging ${i + 1} of ${styles.length}: ${style}`);
      const palette = state.palette && getPalettesForStyle(style).includes(state.palette) ? state.palette : "";
      try {
        const result = await stageRoom({ ...base, originalUrl: url, mode: "stage", style, palette });
        const row = result.stagings[0];
        onMultiProgress({ style, stagedImageUrl: row.staged_image_url, stagingId: row.id, isWatermarked: result.isWatermarked, mlsDisclosure: row.mls_disclosure }, cancelledRef.current ? [] : remaining);
        done++;
      } catch (err) {
        const quota = err instanceof StagingError && err.isQuota;
        toast.error(quota ? "You've used this month's stagings." : `${style}: ${err instanceof Error ? err.message : "failed"}`);
        onMultiProgress({ style, stagedImageUrl: "" }, quota ? [] : remaining);
        if (quota) break;
      }
    }
    if (done > 0 && !cancelledRef.current) toast.success(`Staged in ${done} styles`);
  };

  const buttonLabel = compareRun
    ? `Stage in ${state.compareStyles.length} styles`
    : runCount > 1
      ? `Generate ${runCount} options`
      : actionLabel(state.tool);

  return (
    <section id="upload-section" className="py-16 sm:py-20 px-4 sm:px-6 scroll-mt-16">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Stage a photo</h2>
          <p className="mt-2 text-muted-foreground max-w-xl">
            Drop in a listing photo, choose what to do with it, and get a finished image back in about a minute.
          </p>
        </div>

        {batchFiles ? (
          <BatchStaging
            initialFiles={batchFiles}
            usage={usage}
            remainingStagings={remainingStagings}
            onStagingComplete={onStagingComplete}
            onExit={() => setBatchFiles(null)}
          />
        ) : !image ? (
          <div
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(Array.from(e.dataTransfer.files));
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`rounded-xl border-2 border-dashed px-6 py-16 sm:py-24 text-center cursor-pointer transition-colors ${
              dragOver ? "border-accent bg-accent-soft" : "border-border bg-card hover:border-foreground/30"
            }`}
          >
            <Upload className="w-8 h-8 mx-auto mb-4 text-muted-foreground" aria-hidden />
            <p className="text-lg font-medium">Drop a room photo here, or click to choose</p>
            <p className="mt-1.5 text-sm text-muted-foreground">JPG, PNG or WebP up to 15 MB. Drop up to 15 photos to stage a whole listing.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(Array.from(e.target.files || []));
                e.currentTarget.value = "";
              }}
            />
          </div>
        ) : (
          <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 lg:gap-10 items-start">
            <div className="lg:sticky lg:top-24">
              <div className="relative rounded-xl overflow-hidden border border-border bg-card">
                <img src={image} alt="Your photo" className="w-full max-h-[70vh] object-contain bg-muted" />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <p className="text-muted-foreground flex items-center gap-1.5 min-w-0">
                  <ScanSearch className="w-4 h-4 shrink-0" aria-hidden />
                  <span className="truncate">{detectionText(detecting, detection)}</span>
                </p>
                <button type="button" onClick={resetPhoto} className="shrink-0 inline-flex items-center gap-1.5 font-medium text-foreground hover:text-accent">
                  <RotateCcw className="w-4 h-4" aria-hidden />
                  Use another photo
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-background p-5 sm:p-6 space-y-6">
              <ToolPicker value={state.tool} onChange={(t) => set("tool", t)} suggested={detection?.suggestedTool ?? null} />
              <div className="border-t border-border" />
              <StudioOptions state={state} set={set} isFree={isFree} isAdmin={isAdmin} maxCompare={maxCompare} adminModels={ADMIN_MODELS} />

              {limitReached ? (
                <div className="rounded-lg bg-card border border-border p-5 text-center">
                  <Lock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" aria-hidden />
                  <p className="font-medium">
                    {isFree ? `You've used your ${freeLimit} free stagings this month` : "You've used this month's stagings"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1 mb-4">
                    {isFree ? "Upgrade for hundreds a month, with no watermark." : "Your count resets 30 days after your cycle started."}
                  </p>
                  <button onClick={() => navigate("/pricing")} className="gold-gradient-animated h-10 px-5 rounded-md text-sm font-medium">
                    See plans
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 sticky bottom-0 -mx-5 sm:-mx-6 -mb-5 sm:-mb-6 px-5 sm:px-6 pb-5 sm:pb-6 pt-4 bg-background/95 backdrop-blur border-t border-border rounded-b-xl">
                  <button
                    onClick={handleStage}
                    disabled={isProcessing}
                    className="gold-gradient-animated w-full h-12 rounded-md font-medium disabled:opacity-70 inline-flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                        {progressText || "Working…"}
                      </>
                    ) : (
                      buttonLabel
                    )}
                  </button>
                  {isProcessing && compareRun && (
                    <button
                      onClick={() => {
                        cancelledRef.current = true;
                      }}
                      className="w-full h-10 rounded-md border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/40"
                    >
                      Stop after this style
                    </button>
                  )}
                  <p className={`text-xs text-center ${notEnough ? "text-destructive" : "text-muted-foreground"}`}>
                    {isAdmin
                      ? "Admin: unlimited"
                      : `Uses ${runCount} staging${runCount === 1 ? "" : "s"} · ${remainingStagings} left this month`}
                    {isFree ? " · Free results carry a watermark" : ""}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

function detectionText(detecting: boolean, d: ReturnType<typeof useRoomDetection>["detection"]): string {
  if (detecting) return "Looking at your photo…";
  if (!d) return "Choose a tool and options on the right";
  if (d.exterior) return "Looks like an exterior shot";
  const room = d.roomType ? d.roomType.toLowerCase() : "room";
  if (d.furnished === "empty") return `Looks like an empty ${room}`;
  if (d.furnished === "furnished") return `Looks like a furnished ${room}`;
  return `Looks like a ${room}`;
}

function actionLabel(tool: ToolId): string {
  switch (tool) {
    case "stage":
      return "Stage this room";
    case "remove":
      return "Remove furniture";
    case "declutter":
      return "Declutter photo";
    case "recolor":
      return "Preview new finish";
    case "dusk":
      return "Make it dusk";
    case "sky":
      return "Replace the sky";
    case "lawn":
      return "Refresh the lawn";
  }
}

function progressFor(tool: ToolId, n: number): string {
  if (n > 1) return `Generating ${n} options…`;
  return tool === "stage" ? "Staging your room…" : `${actionLabel(tool)}…`;
}

function doneMessage(tool: ToolId, n: number): string {
  if (n > 1) return `${n} options ready`;
  return tool === "stage" ? "Room staged" : "Done";
}

export default RoomUploader;
