import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Check,
  AlertCircle,
  RotateCcw,
  StopCircle,
  Download,
  GitCompare,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadStagingImage } from "@/lib/uploadStagingImage";
import { useAuth } from "@/hooks/useAuth";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

import { ROOM_TYPES, STYLES, pickPaletteForBatch } from "@/config/catalogs";

export const MAX_BATCH = 15;
const BATCH_DELAY_MS = 2000;

type Status = "queued" | "staging" | "done" | "failed";

interface BatchItem {
  id: string;
  fileName: string;
  original: string; // downscaled data URL
  originalUrl?: string;
  stagedUrl?: string;
  isWatermarked?: boolean;
  roomType: string;
  status: Status;
  error?: string;
}

async function downscaleFile(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const MAX = 2048;
      const long = Math.max(img.naturalWidth, img.naturalHeight);
      if (long <= MAX) {
        resolve(dataUrl);
        return;
      }
      const s = MAX / long;
      const w = Math.round(img.naturalWidth * s);
      const h = Math.round(img.naturalHeight * s);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

interface Props {
  initialFiles: File[];
  usage: { plan: string; stagings_this_month: number } | null;
  remainingStagings: number;
  onStagingComplete: () => Promise<void>;
  onExit: () => void;
}

const StatusPill = ({ status }: { status: Status }) => {
  const map: Record<Status, { label: string; cls: string; Icon: any }> = {
    queued: {
      label: "Queued",
      cls: "text-muted-foreground border-border",
      Icon: null,
    },
    staging: {
      label: "Staging",
      cls: "text-accent border-accent/30 bg-accent/[0.06]",
      Icon: Loader2,
    },
    done: {
      label: "Done",
      cls: "text-accent border-accent/30 bg-accent/[0.08]",
      Icon: Check,
    },
    failed: {
      label: "Failed",
      cls: "text-destructive border-destructive/30 bg-destructive/[0.06]",
      Icon: AlertCircle,
    },
  };
  const { label, cls, Icon } = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 font-body text-[11px] px-2 py-0.5 rounded-full border ${cls}`}
    >
      {Icon && (
        <Icon
          className={`w-3 h-3 ${status === "staging" ? "animate-spin" : ""}`}
        />
      )}
      {label}
    </span>
  );
};

const BatchStaging = ({
  initialFiles,
  usage,
  remainingStagings,
  onStagingComplete,
  onExit,
}: Props) => {
  const { user } = useAuth();
  const [items, setItems] = useState<BatchItem[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [style, setStyle] = useState("Modern");
  const [propertyName, setPropertyName] = useState("");
  const [mlsDisclosure, setMlsDisclosure] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [compareItem, setCompareItem] = useState<BatchItem | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const capped = initialFiles.slice(0, MAX_BATCH);
      const built: BatchItem[] = [];
      for (const f of capped) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > 10 * 1024 * 1024) {
          toast.error(`${f.name} skipped — over 10MB`);
          continue;
        }
        const url = await downscaleFile(f);
        built.push({
          id: crypto.randomUUID(),
          fileName: f.name,
          original: url,
          roomType: "Living Room",
          status: "queued",
        });
      }
      if (!cancelled) {
        setItems(built);
        setLoadingFiles(false);
        if (initialFiles.length > MAX_BATCH) {
          toast.info(`Only the first ${MAX_BATCH} photos were added to the batch`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFree = usage?.plan === "free";
  const totalCount = items.length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const pendingCount = items.filter(
    (i) => i.status === "queued" || i.status === "failed"
  ).length;
  const exceedsFreeLimit = !!isFree && pendingCount > remainingStagings;
  const progressPct =
    totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const stageOne = async (id: string) => {
    // Read the latest snapshot of the item via setItems callback.
    let target: BatchItem | undefined;
    setItems((prev) => {
      target = prev.find((x) => x.id === id);
      return prev.map((x) =>
        x.id === id ? { ...x, status: "staging" as Status, error: undefined } : x
      );
    });
    if (!target) return;

    try {
      const { data, error } = await supabase.functions.invoke("stage-room", {
        body: {
          image: target.original,
          roomType: target.roomType,
          style,
          mode: "stage",
          mls_disclosure: mlsDisclosure,
        },
      });
      if (error) throw error;
      if (!data?.stagedImageUrl) throw new Error("No staged image returned");

      let originalUrl = target.originalUrl;
      let stagedUrl: string = data.stagedImageUrl;

      if (user) {
        const stagingId = crypto.randomUUID();
        const [origU, stagedU] = await Promise.all([
          originalUrl
            ? Promise.resolve(originalUrl)
            : uploadStagingImage(user.id, stagingId, target.original, "original"),
          uploadStagingImage(user.id, stagingId, data.stagedImageUrl, "staged"),
        ]);
        originalUrl = origU;
        stagedUrl = stagedU;

        await supabase.from("stagings").insert({
          id: stagingId,
          user_id: user.id,
          original_image_url: originalUrl,
          staged_image_url: stagedUrl,
          room_type: target.roomType,
          style,
          property_address: propertyName.trim() || null,
          mls_disclosure: mlsDisclosure,
        } as any);
      }

      setItems((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "done" as Status,
                stagedUrl,
                originalUrl,
                isWatermarked: data.isWatermarked,
              }
            : x
        )
      );
    } catch (err: any) {
      console.error("Batch item failed:", err);
      setItems((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "failed" as Status,
                error: err?.message || "Failed",
              }
            : x
        )
      );
    }
  };

  const startBatch = async () => {
    if (processing) return;
    if (exceedsFreeLimit) {
      toast.error(
        `Free plan has ${remainingStagings} staging${
          remainingStagings === 1 ? "" : "s"
        } left. Upgrade for more.`
      );
      return;
    }
    cancelledRef.current = false;
    setProcessing(true);
    try {
      // Snapshot the ids to process at start.
      const ids = items
        .filter((i) => i.status === "queued" || i.status === "failed")
        .map((i) => i.id);
      for (let n = 0; n < ids.length; n++) {
        if (cancelledRef.current) {
          toast.info("Batch cancelled after the current photo.");
          break;
        }
        await stageOne(ids[n]);
        if (n < ids.length - 1 && !cancelledRef.current) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
      }
      await onStagingComplete();
      toast.success("Batch finished");
    } finally {
      setProcessing(false);
      cancelledRef.current = false;
    }
  };

  const retryItem = async (id: string) => {
    if (processing) return;
    setProcessing(true);
    try {
      await stageOne(id);
      await onStagingComplete();
    } finally {
      setProcessing(false);
    }
  };

  const removeItem = (id: string) => {
    if (processing) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const changeRoomType = (id: string, rt: string) => {
    if (processing) return;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, roomType: rt } : i)));
  };

  const downloadAll = async () => {
    const done = items.filter((i) => i.status === "done" && i.stagedUrl);
    if (done.length === 0) return;
    const prefix = propertyName.trim()
      ? propertyName.trim().replace(/[^a-z0-9\-_]+/gi, "-").toLowerCase()
      : "staged-room";
    const mlsTag = mlsDisclosure ? "-virtually-staged" : "";
    for (let n = 0; n < done.length; n++) {
      const it = done[n];
      try {
        const res = await fetch(it.stagedUrl!);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${prefix}-${String(n + 1).padStart(2, "0")}-${it.roomType
          .replace(/\s+/g, "-")
          .toLowerCase()}${mlsTag}.jpg`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        await new Promise((r) => setTimeout(r, 250));
      } catch (e) {
        console.error("Download failed", e);
      }
    }
  };

  if (loadingFiles) {
    return (
      <div className="border border-white/[0.06] rounded-2xl p-16 text-center bg-white/[0.02]">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-accent" />
        <p className="font-body text-sm text-muted-foreground">
          Preparing your batch…
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="border border-white/[0.06] rounded-2xl p-12 text-center bg-white/[0.02]">
        <p className="font-body text-sm text-muted-foreground mb-4">
          No valid images in this batch.
        </p>
        <button
          onClick={onExit}
          className="font-body text-sm text-accent hover:underline"
        >
          Start over
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Batch header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-accent font-body text-[11px] tracking-[0.3em] uppercase mb-1">
            Batch Staging
          </p>
          <p className="font-display text-2xl font-medium">
            {items.length} photo{items.length !== 1 ? "s" : ""} queued
          </p>
        </div>
        <button
          onClick={onExit}
          disabled={processing}
          className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
        >
          Start over
        </button>
      </div>

      {/* Shared property name */}
      <div className="mb-6">
        <label className="font-body text-sm font-medium text-muted-foreground block mb-2">
          Property Name (applied to all)
        </label>
        <input
          type="text"
          value={propertyName}
          disabled={processing}
          onChange={(e) => setPropertyName(e.target.value)}
          placeholder="e.g., 123 Oak Street or Lakeside Condo"
          className="w-full font-body text-sm bg-white/[0.02] border border-white/[0.08] rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-muted-foreground/50 disabled:opacity-60"
        />
      </div>

      {/* Shared style */}
      <div className="mb-6">
        <label className="font-body text-sm font-medium text-muted-foreground block mb-3">
          Design Style (applied to all)
        </label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s}
              disabled={processing}
              onClick={() => setStyle(s)}
              className={`font-body text-sm px-4 py-2 rounded-lg border transition-all disabled:opacity-60 ${
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

      {/* Shared MLS toggle */}
      <div className="mb-6 flex items-start justify-between gap-4 p-4 rounded-xl border border-border">
        <div className="min-w-0">
          <p className="font-body text-sm font-medium">MLS disclosure label</p>
          <p className="font-body text-xs text-muted-foreground leading-snug mt-0.5">
            Adds a subtle "Virtually Staged" label to every photo in the batch.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={mlsDisclosure}
          aria-label="Toggle MLS disclosure label"
          disabled={processing}
          onClick={() => setMlsDisclosure((v) => !v)}
          className={`relative shrink-0 w-10 h-6 rounded-full transition-colors disabled:opacity-60 ${
            mlsDisclosure ? "bg-accent" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow-sm transition-transform ${
              mlsDisclosure ? "translate-x-4" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Queue list */}
      <div className="mb-6 border border-white/[0.06] rounded-2xl bg-white/[0.02] overflow-hidden">
        <div className="divide-y divide-white/[0.06]">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4"
            >
              {/* Thumbnails: original + staged (if done) */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-white/[0.06]">
                  <img
                    src={it.original}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                {it.status === "done" && it.stagedUrl && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-accent/30">
                      <img
                        src={it.stagedUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Meta + room-type dropdown */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <p className="font-body text-sm truncate max-w-[16rem]">
                    {it.fileName}
                  </p>
                  <StatusPill status={it.status} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={it.roomType}
                    disabled={processing || it.status === "done"}
                    onChange={(e) => changeRoomType(it.id, e.target.value)}
                    className="font-body text-xs bg-background/60 border border-white/[0.08] rounded-md px-2 py-1 focus:outline-none focus:border-accent/50 disabled:opacity-60"
                  >
                    {ROOM_TYPES.map((rt) => (
                      <option key={rt} value={rt}>
                        {rt}
                      </option>
                    ))}
                  </select>
                  {it.status === "failed" && it.error && (
                    <span className="font-body text-[11px] text-destructive/80 truncate max-w-[16rem]">
                      {it.error}
                    </span>
                  )}
                </div>
              </div>

              {/* Row actions */}
              <div className="flex items-center gap-1 shrink-0">
                {it.status === "done" && it.stagedUrl && it.originalUrl && (
                  <button
                    onClick={() => setCompareItem(it)}
                    className="p-2 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/[0.06] transition-colors"
                    title="Compare before / after"
                    aria-label="Compare"
                  >
                    <GitCompare className="w-4 h-4" />
                  </button>
                )}
                {it.status === "failed" && (
                  <button
                    onClick={() => retryItem(it.id)}
                    disabled={processing}
                    className="p-2 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/[0.06] transition-colors disabled:opacity-40"
                    title="Retry"
                    aria-label="Retry"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                {it.status !== "staging" && it.status !== "done" && (
                  <button
                    onClick={() => removeItem(it.id)}
                    disabled={processing}
                    className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/[0.06] transition-colors disabled:opacity-40"
                    title="Remove"
                    aria-label="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Usage line */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="font-body text-xs text-muted-foreground">
          This will use{" "}
          <span className="text-foreground font-medium">
            {pendingCount} staging{pendingCount !== 1 ? "s" : ""}
          </span>
          {isFree && (
            <>
              {" "}·{" "}
              <span
                className={
                  exceedsFreeLimit ? "text-destructive" : "text-muted-foreground"
                }
              >
                {remainingStagings} remaining on Free
              </span>
            </>
          )}
        </p>
        {processing && (
          <p className="font-body text-xs text-accent">
            {doneCount + failedCount} of {totalCount} processed
          </p>
        )}
      </div>

      {/* Progress bar */}
      {(processing || doneCount > 0) && (
        <div className="mb-6 h-1 rounded-full bg-white/[0.05] overflow-hidden">
          <div
            className="h-full gold-gradient-animated transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Footer actions */}
      <div className="space-y-3">
        {!processing ? (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={startBatch}
            disabled={pendingCount === 0 || exceedsFreeLimit}
            className="w-full gold-gradient-animated text-accent-foreground font-body font-semibold text-base py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {pendingCount === 0
              ? "All photos staged"
              : exceedsFreeLimit
              ? `Not enough stagings left on Free (${remainingStagings})`
              : `Stage ${pendingCount} Photo${pendingCount !== 1 ? "s" : ""}`}
          </motion.button>
        ) : (
          <motion.button
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => {
              cancelledRef.current = true;
              toast.info("Cancelling after current photo…");
            }}
            disabled={cancelledRef.current}
            className="w-full border border-border font-body text-sm py-3 rounded-lg text-muted-foreground hover:border-destructive/30 hover:text-destructive transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <StopCircle className="w-4 h-4" />
            Cancel After Current Photo
          </motion.button>
        )}

        {doneCount > 0 && !processing && (
          <button
            onClick={downloadAll}
            className="w-full border border-accent/30 text-accent hover:bg-accent/[0.06] font-body font-semibold text-sm py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download All ({doneCount})
          </button>
        )}
      </div>

      {/* Compare modal */}
      <AnimatePresence>
        {compareItem && compareItem.originalUrl && compareItem.stagedUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-md overflow-y-auto"
            onClick={() => setCompareItem(null)}
          >
            <div className="min-h-screen" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/[0.06] bg-background/80 backdrop-blur-md">
                <p className="font-body text-sm text-muted-foreground truncate">
                  {compareItem.fileName} · {compareItem.roomType}
                </p>
                <button
                  onClick={() => setCompareItem(null)}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
                  aria-label="Close comparison"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <BeforeAfterSlider
                before={compareItem.originalUrl}
                after={compareItem.stagedUrl}
                isWatermarked={compareItem.isWatermarked}
                mlsDisclosure={mlsDisclosure}
                onReset={() => setCompareItem(null)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BatchStaging;
