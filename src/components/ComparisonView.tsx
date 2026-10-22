import { useEffect, useState } from "react";
import { ArrowLeft, AlertCircle, Loader2, RotateCcw } from "lucide-react";
import BeforeAfterSlider, { type RefineContext } from "@/components/BeforeAfterSlider";
import DownloadWithPresets from "@/components/DownloadWithPresets";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import type { StagingResult } from "@/components/RoomUploader";
import { supabase } from "@/integrations/supabase/client";
import { isToolId } from "@/config/tools";

interface ComparisonViewProps {
  original: string;
  results: StagingResult[];
  pendingStyles?: string[];
  onReset: () => void;
  isWatermarked?: boolean;
  /** Room type of the run; enables refine without a lookup. */
  roomType?: string;
  /** Style used for "Option n" variation runs (labels aren't styles). */
  baseStyle?: string;
}

const isOptionLabel = (s: string) => /^Option \d+$/.test(s);

/** Build refine settings from props, or fall back to the saved staging row. */
function useRefineContext(selected: StagingResult | null, roomType?: string, baseStyle?: string) {
  const [fetched, setFetched] = useState<{ id: string; ctx: RefineContext } | null>(null);
  const stagingId = selected?.stagingId;
  const needsLookup = !!stagingId && !roomType;

  useEffect(() => {
    if (!needsLookup || !stagingId) return;
    let cancelled = false;
    supabase
      .from("stagings")
      .select("room_type, style, kind, custom_instructions, staging_palette, property_address")
      .eq("id", stagingId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error("Couldn't load staging settings:", error);
        if (cancelled || !data) return;
        setFetched({
          id: stagingId,
          ctx: {
            stagingId,
            tool: isToolId(data.kind) ? data.kind : undefined,
            roomType: data.room_type,
            style: data.style,
            customInstructions: data.custom_instructions,
            palette: data.staging_palette,
            propertyName: data.property_address,
          },
        });
      });
    return () => {
      cancelled = true;
    };
  }, [needsLookup, stagingId]);

  if (!selected || !stagingId) return undefined;
  if (roomType) {
    const style = isOptionLabel(selected.style) ? baseStyle ?? "Modern" : selected.style;
    return { stagingId, tool: "stage" as const, roomType, style };
  }
  return fetched?.id === stagingId ? fetched.ctx : undefined;
}

const ComparisonView = ({ original, results, pendingStyles = [], onReset, isWatermarked, roomType, baseStyle }: ComparisonViewProps) => {
  const [selected, setSelected] = useState<StagingResult | null>(null);
  const refineContext = useRefineContext(selected, roomType, baseStyle);

  const total = results.length + pendingStyles.length;
  const doneCount = results.filter((r) => r.stagedImageUrl).length;
  const failedCount = results.length - doneCount;
  const working = pendingStyles.length > 0;
  const isVariations = results.concat(pendingStyles.map((s) => ({ style: s, stagedImageUrl: "" }))).every((r) => isOptionLabel(r.style));
  const noun = isVariations ? "option" : "style";

  useEffect(() => {
    if (!selected) return;
    window.scrollTo({ top: 0 });
  }, [selected]);

  if (selected) {
    return (
      <div>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="inline-flex items-center gap-1.5 h-9 -ml-2 px-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-card"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            All {noun}s
          </button>
        </div>
        <BeforeAfterSlider
          before={original}
          after={selected.stagedImageUrl}
          isWatermarked={selected.isWatermarked ?? isWatermarked}
          mlsDisclosure={selected.mlsDisclosure}
          refineContext={refineContext}
          title={isVariations && baseStyle ? `${selected.style}: ${baseStyle}` : selected.style}
        />
      </div>
    );
  }

  return (
    <section className="py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-normal tracking-[-0.02em]">
              {working ? `Staging ${noun} ${Math.min(results.length + 1, total)} of ${total}` : `${doneCount} ${noun}${doneCount === 1 ? "" : "s"} ready`}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {working
                ? `Each ${noun} takes about a minute. You can leave this tab open while they finish.`
                : "Open any result to compare it with the original, refine it or download it."}
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border bg-background text-sm font-medium hover:bg-card"
          >
            <RotateCcw className="w-4 h-4" aria-hidden />
            Stage another photo
          </button>
        </div>

        {working && (
          <div className="mb-6" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={results.length} aria-label="Progress">
            <div className="h-1.5 rounded-sm bg-muted overflow-hidden">
              <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${total ? (results.length / total) * 100 : 0}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground tabular-nums">
              {results.length} of {total} done{failedCount > 0 ? `, ${failedCount} failed` : ""}
            </p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <figure className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="relative aspect-[4/3]">
              <ProgressiveImage src={original} alt="Original photo" wrapperClassName="absolute inset-0" eager />
              <span className="absolute top-3 left-3 rounded-sm bg-foreground/75 text-background px-2 py-1 text-xs font-medium">Before</span>
            </div>
            <figcaption className="px-4 py-3 text-sm font-medium">Original photo</figcaption>
          </figure>

          {results.map((r, i) =>
            r.stagedImageUrl ? (
              <article key={`${r.style}-${i}`} className="group rounded-xl border border-border bg-background overflow-hidden hover:border-foreground/30 transition-colors">
                <button
                  type="button"
                  onClick={() => setSelected(r)}
                  className="relative block w-full aspect-[4/3] text-left"
                  aria-label={`Open ${r.style} to compare and refine`}
                >
                  <ProgressiveImage src={r.stagedImageUrl} alt={`${r.style} result`} wrapperClassName="absolute inset-0" />
                  <span className="absolute top-3 right-3 rounded-sm bg-background/90 text-foreground px-2 py-1 text-xs font-medium">After</span>
                </button>
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.style}</p>
                    <button type="button" onClick={() => setSelected(r)} className="text-xs text-accent hover:underline">
                      Compare and refine
                    </button>
                  </div>
                  <DownloadWithPresets
                    imageUrl={r.stagedImageUrl}
                    filename={`staged-${r.style.toLowerCase().replace(/\s+/g, "-")}`}
                    variant="outline"
                    isWatermarked={r.isWatermarked ?? isWatermarked}
                    mlsDisclosure={r.mlsDisclosure}
                  />
                </div>
              </article>
            ) : (
              <article key={`${r.style}-${i}`} className="rounded-xl border border-destructive/30 bg-background overflow-hidden">
                <div className="aspect-[4/3] bg-card flex flex-col items-center justify-center gap-2 px-6 text-center">
                  <AlertCircle className="w-5 h-5 text-destructive" aria-hidden />
                  <p className="text-sm font-medium">This {noun} didn't finish</p>
                  <p className="text-xs text-muted-foreground">It failed or was stopped. Stage it again from the studio.</p>
                </div>
                <p className="px-4 py-3 text-sm font-medium">{r.style}</p>
              </article>
            ),
          )}

          {pendingStyles.map((s, i) => (
            <article key={`pending-${s}-${i}`} className="rounded-xl border border-border bg-background overflow-hidden" aria-busy="true">
              <div className="aspect-[4/3] bg-card animate-pulse flex flex-col items-center justify-center gap-2">
                {i === 0 ? <Loader2 className="w-5 h-5 text-accent animate-spin" aria-hidden /> : null}
                <p className="text-sm text-muted-foreground">{i === 0 ? "Staging…" : "Queued"}</p>
              </div>
              <p className="px-4 py-3 text-sm font-medium text-muted-foreground">{s}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComparisonView;
