import { useState, useEffect, useRef } from "react";
import { X, Loader2, Check, AlertCircle, RotateCcw, Square, Download, Columns2, ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { stageRoom, uploadOriginal } from "@/lib/stagingApi";
import { useAuth } from "@/hooks/useAuth";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import Chips from "@/components/studio/Chips";
import { ROOM_TYPES, STYLES, pickPaletteForBatch } from "@/config/catalogs";

export const MAX_BATCH = 15;
const BATCH_DELAY_MS = 2000;
const MAX_FILE_MB = 15;

type Status = "queued" | "staging" | "done" | "failed";

interface BatchItem {
  id: string;
  fileName: string;
  original: string; // downscaled data URL
  originalUrl?: string;
  stagingId?: string;
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

const STATUS_TAGS: Record<Status, { label: string; cls: string; Icon: LucideIcon | null }> = {
  queued: { label: "Queued", cls: "text-muted-foreground border-border bg-background", Icon: null },
  staging: { label: "Staging", cls: "text-accent border-accent/30 bg-accent-soft", Icon: Loader2 },
  done: { label: "Done", cls: "text-accent border-accent/30 bg-accent-soft", Icon: Check },
  failed: { label: "Failed", cls: "text-destructive border-destructive/30 bg-destructive/5", Icon: AlertCircle },
};

const StatusTag = ({ status }: { status: Status }) => {
  const { label, cls, Icon } = STATUS_TAGS[status];
  return (
    <span className={`inline-flex items-center gap-1 h-6 px-2 rounded-sm border text-xs font-medium ${cls}`}>
      {Icon && <Icon className={`w-3 h-3 ${status === "staging" ? "animate-spin" : ""}`} aria-hidden />}
      {label}
    </span>
  );
};

const secondaryBtn =
  "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-border bg-background text-sm font-medium hover:bg-card transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
const iconBtn =
  "w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card transition-colors disabled:opacity-40";

const SettingToggle = ({
  title,
  desc,
  checked,
  disabled,
  onChange,
  children,
}: {
  title: string;
  desc: string;
  checked: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) => (
  <div className="rounded-lg border border-border p-3.5">
    <label className={`flex items-start justify-between gap-4 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      <span>
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs text-muted-foreground mt-0.5">{desc}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--accent))]"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
    {children}
  </div>
);

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
  const [consistency, setConsistency] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [compareItem, setCompareItem] = useState<BatchItem | null>(null);
  const cancelledRef = useRef(false);
  const batchSeedRef = useRef<string>(crypto.randomUUID());

  // Palette is derived from style + a stable batch seed (or property name once
  // the agent types one) so all rooms in this batch coordinate.
  const paletteSeed = propertyName.trim() || batchSeedRef.current;
  const sharedPalette = consistency ? pickPaletteForBatch(style, paletteSeed) : "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const capped = initialFiles.slice(0, MAX_BATCH);
      const built: BatchItem[] = [];
      for (const f of capped) {
        if (!f.type.startsWith("image/")) continue;
        if (f.size > MAX_FILE_MB * 1024 * 1024) {
          toast.error(`Skipped ${f.name}: it's over ${MAX_FILE_MB} MB.`);
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
  const isAdmin = usage?.plan === "admin";
  const totalCount = items.length;
  const doneCount = items.filter((i) => i.status === "done").length;
  const failedCount = items.filter((i) => i.status === "failed").length;
  const pendingCount = items.filter(
    (i) => i.status === "queued" || i.status === "failed"
  ).length;
  const exceedsFreeLimit = pendingCount > remainingStagings;
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
      if (!user) throw new Error("Please sign in again.");
      const originalUrl = target.originalUrl ?? (await uploadOriginal(user.id, target.original));
      const result = await stageRoom({
        originalUrl,
        mode: "stage",
        roomType: target.roomType,
        style,
        mlsDisclosure,
        palette: sharedPalette || undefined,
        propertyName: propertyName.trim() || undefined,
      });
      const row = result.stagings[0];

      setItems((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "done" as Status,
                stagedUrl: row.staged_image_url,
                stagingId: row.id,
                originalUrl,
                isWatermarked: result.isWatermarked,
              }
            : x
        )
      );
    } catch (err) {
      console.error("Batch item failed:", err);
      setItems((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "failed" as Status,
                error: err instanceof Error ? err.message : "Failed",
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
        `You have ${remainingStagings} staging${
          remainingStagings === 1 ? "" : "s"
        } left this month.${isFree ? " Upgrade for more." : ""}`
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
      <div className="rounded-xl border border-border bg-card px-6 py-16 text-center" role="status">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-accent" aria-hidden />
        <p className="text-sm text-muted-foreground">Preparing your photos…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
        <p className="font-medium">None of those files could be opened</p>
        <p className="mt-1 text-sm text-muted-foreground mb-5">Use JPG, PNG or WebP photos up to {MAX_FILE_MB} MB.</p>
        <button type="button" onClick={onExit} className={secondaryBtn}>
          Choose other photos
        </button>
      </div>
    );
  }

  if (compareItem && compareItem.originalUrl && compareItem.stagedUrl) {
    return (
      <div className="rounded-xl border border-border bg-background">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 pt-4">
          <button
            type="button"
            onClick={() => setCompareItem(null)}
            className="inline-flex items-center gap-1.5 h-9 -ml-2 px-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-card"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            Back to all photos
          </button>
          <p className="text-sm text-muted-foreground truncate">{compareItem.fileName}</p>
        </div>
        <BeforeAfterSlider
          before={compareItem.originalUrl}
          after={compareItem.stagedUrl}
          isWatermarked={compareItem.isWatermarked}
          mlsDisclosure={mlsDisclosure}
          refineContext={{
            stagingId: compareItem.stagingId,
            tool: "stage",
            roomType: compareItem.roomType,
            style,
            propertyName: propertyName.trim() || null,
            palette: sharedPalette || null,
          }}
        />
      </div>
    );
  }

  const startLabel =
    pendingCount === 0
      ? "All photos staged"
      : exceedsFreeLimit
        ? `Not enough stagings left (${remainingStagings})`
        : `Stage ${pendingCount} photo${pendingCount !== 1 ? "s" : ""}`;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-8 items-start">
      {/* Queue */}
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">
              {items.length} photo{items.length !== 1 ? "s" : ""} in this listing
            </h3>
            <p className="text-sm text-muted-foreground tabular-nums">
              {doneCount} done{failedCount > 0 ? `, ${failedCount} failed` : ""}
            </p>
          </div>
          <button type="button" onClick={onExit} disabled={processing} className={secondaryBtn}>
            Start over
          </button>
        </div>

        {(processing || doneCount > 0) && (
          <div
            className="mb-4 h-1.5 rounded-sm bg-muted overflow-hidden"
            role="progressbar"
            aria-label="Batch progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${progressPct}%` }} />
          </div>
        )}

        <ul className="rounded-xl border border-border bg-background divide-y divide-border overflow-hidden">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 shrink-0">
                <img src={it.original} alt={`Original: ${it.fileName}`} className="w-14 h-14 sm:w-20 sm:h-16 rounded-md object-cover border border-border" />
                {it.status === "done" && it.stagedUrl && (
                  <img src={it.stagedUrl} alt={`Staged: ${it.fileName}`} className="w-14 h-14 sm:w-20 sm:h-16 rounded-md object-cover border border-accent/40" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 min-w-0">
                  <p className="text-sm font-medium truncate">{it.fileName}</p>
                  <StatusTag status={it.status} />
                </div>
                <label className="sr-only" htmlFor={`room-${it.id}`}>
                  Room type for {it.fileName}
                </label>
                <select
                  id={`room-${it.id}`}
                  value={it.roomType}
                  disabled={processing || it.status === "done"}
                  onChange={(e) => changeRoomType(it.id, e.target.value)}
                  className="h-8 max-w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring disabled:opacity-60"
                >
                  {ROOM_TYPES.map((rt) => (
                    <option key={rt} value={rt}>
                      {rt}
                    </option>
                  ))}
                </select>
                {it.status === "failed" && it.error && <p className="mt-1.5 text-xs text-destructive">{it.error}</p>}
              </div>

              <div className="flex items-center gap-0.5 shrink-0">
                {it.status === "done" && it.stagedUrl && it.originalUrl && (
                  <button type="button" onClick={() => setCompareItem(it)} className={iconBtn} title="Compare and refine" aria-label={`Compare and refine ${it.fileName}`}>
                    <Columns2 className="w-4 h-4" aria-hidden />
                  </button>
                )}
                {it.status === "failed" && (
                  <button type="button" onClick={() => retryItem(it.id)} disabled={processing} className={iconBtn} title="Try again" aria-label={`Try ${it.fileName} again`}>
                    <RotateCcw className="w-4 h-4" aria-hidden />
                  </button>
                )}
                {it.status !== "staging" && it.status !== "done" && (
                  <button type="button" onClick={() => removeItem(it.id)} disabled={processing} className={iconBtn} title="Remove" aria-label={`Remove ${it.fileName}`}>
                    <X className="w-4 h-4" aria-hidden />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Shared settings */}
      <div className="rounded-xl border border-border bg-background p-5 sm:p-6 space-y-5 lg:sticky lg:top-24">
        <label className="block">
          <span className="block text-sm font-medium mb-2">Property name</span>
          <input
            type="text"
            value={propertyName}
            disabled={processing}
            onChange={(e) => setPropertyName(e.target.value)}
            placeholder="e.g. 123 Oak Street"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring disabled:opacity-60"
          />
          <span className="block mt-1.5 text-xs text-muted-foreground">Used in file names and saved with each staging.</span>
        </label>

        <Chips
          label="Style for every photo"
          options={STYLES.map((s) => ({ value: s, label: s, disabled: processing }))}
          selected={[style]}
          onToggle={setStyle}
        />

        <SettingToggle
          title="Matching look across rooms"
          desc="One coordinated palette so every room reads as the same home."
          checked={consistency}
          disabled={processing}
          onChange={setConsistency}
        >
          {consistency && sharedPalette && (
            <p className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">Palette: {sharedPalette}</p>
          )}
        </SettingToggle>

        <SettingToggle
          title={'"Virtually staged" label'}
          desc="Adds a small disclosure to every photo. Many MLS boards require it."
          checked={mlsDisclosure}
          disabled={processing}
          onChange={setMlsDisclosure}
        />

        <div className="space-y-2.5 border-t border-border pt-5">
          {!processing ? (
            <button
              type="button"
              onClick={startBatch}
              disabled={pendingCount === 0 || exceedsFreeLimit}
              className="gold-gradient-animated w-full h-12 rounded-md font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {startLabel}
            </button>
          ) : (
            <>
              <div className="w-full h-12 rounded-md bg-accent-soft text-accent font-medium inline-flex items-center justify-center gap-2" role="status">
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                Staging {Math.min(doneCount + failedCount + 1, totalCount)} of {totalCount}…
              </div>
              <button
                type="button"
                onClick={() => {
                  cancelledRef.current = true;
                  toast.info("Stopping after the current photo.");
                }}
                className="w-full h-10 rounded-md border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/40 inline-flex items-center justify-center gap-2"
              >
                <Square className="w-3.5 h-3.5" aria-hidden />
                Stop after this photo
              </button>
            </>
          )}

          {doneCount > 0 && !processing && (
            <button type="button" onClick={downloadAll} className={`${secondaryBtn} w-full`}>
              <Download className="w-4 h-4" aria-hidden />
              Download all ({doneCount})
            </button>
          )}

          <p className={`text-xs text-center ${exceedsFreeLimit ? "text-destructive" : "text-muted-foreground"}`}>
            {isAdmin
              ? "Admin: unlimited."
              : `Uses ${pendingCount} staging${pendingCount !== 1 ? "s" : ""}. ${remainingStagings} left this month.`}
            {isFree ? " Free results carry a watermark." : ""}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BatchStaging;
