import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Trash2,
  X,
  LogOut,
  Download,
  RefreshCw,
  Search,
  ChevronDown,
  Share2,
  User,
  Link2,
  Plus,
  ImagePlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { StagingRow } from "@/lib/stagingApi";
import { exportListingZip } from "@/lib/exportListing";
import { useAuth } from "@/hooks/useAuth";
import { useUsage } from "@/hooks/useUsage";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import UsageIndicator from "@/components/UsageIndicator";
import ShareDialog from "@/components/ShareDialog";
import AgentProfileDialog from "@/components/AgentProfileDialog";
import ListingShareDialog from "@/components/ListingShareDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { isToolId } from "@/config/tools";
import { thumbUrl } from "@/lib/imageUrl";

type Staging = StagingRow;

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const UNLABELED = "Unlabeled";

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const NAV_ITEM = `inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-foreground ${FOCUS_RING}`;
const SECONDARY_BTN = `inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-card ${FOCUS_RING}`;
const PRIMARY_BTN = `gold-gradient-animated inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium ${FOCUS_RING}`;
const ICON_BTN = `inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-card hover:text-foreground ${FOCUS_RING}`;

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const plural = (n: number, word: string, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;

/** Small squared tag used for row metadata. */
const Tag = ({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[11px] font-medium leading-none ${
      tone === "accent" ? "border-accent/20 bg-accent-soft text-accent" : "border-border bg-card text-muted-foreground"
    }`}
  >
    {children}
  </span>
);

interface StagingCardProps {
  staging: Staging;
  onOpen: () => void;
  onShare: () => void;
  onReStage: () => void;
  onDelete: () => void;
}

const StagingCard = ({ staging, onOpen, onShare, onReStage, onDelete }: StagingCardProps) => {
  const isEdit = !!staging.parent_id;
  const editLabel = staging.kind === "refine" ? "Refined" : "Edit";
  const label = `${staging.room_type}, ${staging.style}`;

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={onOpen}
        className={`group block w-full rounded-xl ${FOCUS_RING}`}
        aria-label={`Open ${label} before and after`}
      >
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
          <ProgressiveImage
            src={thumbUrl(staging.staged_image_url)}
            alt={label}
            wrapperClassName="absolute inset-0"
            className="transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        </div>
      </button>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium capitalize">{staging.room_type}</p>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">
            {staging.style}
            <span className="text-muted-foreground/70">, {formatDate(staging.created_at)}</span>
          </p>
          {(isEdit || staging.mls_disclosure || staging.share_token) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {isEdit && <Tag>{editLabel}</Tag>}
              {staging.mls_disclosure && <Tag>MLS label</Tag>}
              {staging.share_token && (
                <Tag tone="accent">
                  <Link2 className="h-3 w-3" aria-hidden />
                  Link on
                </Tag>
              )}
            </div>
          )}
        </div>

        <div className="-mr-1.5 flex flex-shrink-0 items-center">
          <button
            type="button"
            onClick={onShare}
            className={ICON_BTN}
            aria-label={staging.share_token ? `Manage share link for ${label}` : `Share ${label}`}
            title={staging.share_token ? "Manage share link" : "Share"}
          >
            <Share2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onReStage}
            className={ICON_BTN}
            aria-label={`Stage ${label} again with different settings`}
            title="Stage again"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className={`${ICON_BTN} hover:bg-destructive/10 hover:text-destructive`}
            aria-label={`Delete ${label}`}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </li>
  );
};

const GallerySkeleton = () => (
  <div className="space-y-12" aria-busy="true" aria-label="Loading your stagings">
    {[0, 1].map((groupIdx) => (
      <div key={groupIdx}>
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-3.5 w-20" />
          </div>
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

const Gallery = () => {
  const { signOut } = useAuth();
  const { usage, planLimit } = useUsage();
  const navigate = useNavigate();
  const [stagings, setStagings] = useState<Staging[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaging, setSelectedStaging] = useState<Staging | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [shareStaging, setShareStaging] = useState<Staging | null>(null);
  const [shareListingProperty, setShareListingProperty] = useState<string | null>(null);
  const [showAgentCard, setShowAgentCard] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const fetchStagings = useCallback(async (pageNum = 0, append = false) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("stagings")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching stagings:", error);
      toast.error("Couldn't load your stagings. Refresh the page to try again.");
    } else {
      const rows = data || [];
      setStagings((prev) => (append ? [...prev, ...rows] : rows));
      setHasMore(rows.length === PAGE_SIZE);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStagings();
  }, [fetchStagings]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchStagings(nextPage, true);
  };

  const handleDelete = async (id: string) => {
    setDeleting(true);
    // The server removes the row and its files, including the private master.
    const { error } = await supabase.functions.invoke("delete-staging", { body: { id } });
    if (error) {
      console.error("Delete staging failed:", error);
      toast.error("Couldn't delete the photo. Please try again.");
    } else {
      setStagings((prev) => prev.filter((s) => s.id !== id));
      toast.success("Photo deleted");
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const handleReStage = (staging: Staging) => {
    navigate("/app", {
      state: {
        reStageImage: staging.original_image_url,
        reStageRoomType: staging.room_type,
        reStageStyle: staging.style,
        reStageCustomInstructions: staging.custom_instructions || "",
        reStagePalette: staging.staging_palette || "",
      },
    });
  };

  const handleBulkDownload = async (groupName: string, groupStagings: Staging[]) => {
    const id = toast.loading(`Preparing ${plural(groupStagings.length, "photo")}…`);
    try {
      const { failed } = await exportListingZip(groupName, groupStagings, (done, total) =>
        toast.loading(`Adding photos ${done} of ${total}…`, { id }),
      );
      if (failed.length > 0) {
        toast.warning(`Downloaded, but ${plural(failed.length, "photo")} couldn't be added.`, { id });
      } else {
        toast.success("Downloaded. Originals and edits are paired in the zip.", { id });
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Couldn't build the download. Please try again.", { id });
    }
  };

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const grouped = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    const filtered = query
      ? stagings.filter((s) => (s.property_address || UNLABELED).toLowerCase().includes(query))
      : stagings;

    const groups: Record<string, Staging[]> = {};
    for (const s of filtered) {
      const key = s.property_address?.trim() || UNLABELED;
      groups[key] = [...(groups[key] ?? []), s];
    }
    return groups;
  }, [stagings, debouncedSearch]);

  const totalCount = stagings.length;
  const groupKeys = Object.keys(grouped);
  const propertyCount = new Set(stagings.map((s) => s.property_address?.trim() || UNLABELED)).size;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <Link to="/app" aria-label="RealVision studio" className={`rounded-md ${FOCUS_RING}`}>
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
            {usage && (
              <div className="mr-1 hidden min-w-0 sm:mr-3 sm:block">
                <UsageIndicator
                  plan={usage.plan}
                  used={usage.stagings_this_month}
                  limit={planLimit}
                  monthResetAt={usage.month_reset_at}
                />
              </div>
            )}
            <button type="button" onClick={() => setShowAgentCard(true)} className={NAV_ITEM} aria-label="Contact card">
              <User className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Contact card</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className={NAV_ITEM}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Sign out</span>
            </button>
            <Link to="/app" className={`${PRIMARY_BTN} ml-1`}>
              <Plus className="h-4 w-4" aria-hidden />
              <span>
                Stage<span className="hidden sm:inline"> a photo</span>
              </span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-normal tracking-[-0.02em] sm:text-3xl">My stagings</h1>
              <p className="mt-1 text-muted-foreground">
                {loading
                  ? "Loading your photos…"
                  : totalCount > 0
                    ? `${plural(totalCount, "photo")} across ${plural(propertyCount, "property", "properties")}${hasMore ? " so far" : ""}`
                    : "Your staged and edited photos are saved here, grouped by property."}
              </p>
            </div>
            {!loading && totalCount > 0 && (
              <div className="relative w-full sm:w-72">
                <label htmlFor="gallery-search" className="sr-only">
                  Search by property
                </label>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  id="gallery-search"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by property"
                  className={`h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 ${FOCUS_RING} focus-visible:ring-offset-0`}
                />
              </div>
            )}
          </div>

          {loading ? (
            <GallerySkeleton />
          ) : totalCount === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-background">
                <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
              </div>
              <h2 className="font-body text-lg font-semibold tracking-tight">Stage your first photo</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-muted-foreground">
                Upload a photo of an empty room and get it staged in about a minute. Every result is saved here.
              </p>
              <Link to="/app" className={`${PRIMARY_BTN} mt-6 h-10 px-4`}>
                Stage a photo
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-12">
                {groupKeys.map((groupName) => {
                  const groupStagings = grouped[groupName];
                  const isCollapsed = collapsedGroups.has(groupName);
                  const panelId = `group-${encodeURIComponent(groupName)}`;

                  return (
                    <section key={groupName} aria-label={groupName}>
                      <div className="mb-5 flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          onClick={() => toggleGroup(groupName)}
                          aria-expanded={!isCollapsed}
                          aria-controls={panelId}
                          className={`group -ml-1 flex min-w-0 items-start gap-2 rounded-md px-1 py-0.5 text-left ${FOCUS_RING}`}
                        >
                          <ChevronDown
                            className={`mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                            aria-hidden
                          />
                          <span className="min-w-0">
                            <h2 className="font-body break-words text-lg font-semibold tracking-tight group-hover:text-accent">
                              {groupName === UNLABELED ? "No property name" : groupName}
                            </h2>
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {plural(groupStagings.length, "photo")}
                            </span>
                          </span>
                        </button>
                        <div className="flex flex-wrap items-center gap-2 pl-7 sm:pl-0">
                          {groupName !== UNLABELED && (
                            <button
                              type="button"
                              onClick={() => setShareListingProperty(groupName)}
                              className={SECONDARY_BTN}
                            >
                              <Link2 className="h-4 w-4" aria-hidden />
                              Share listing page
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleBulkDownload(groupName, groupStagings)}
                            className={PRIMARY_BTN}
                            title="Zip of every photo paired with its original, plus a disclosure note"
                          >
                            <Download className="h-4 w-4" aria-hidden />
                            Download for MLS
                          </button>
                        </div>
                      </div>

                      {!isCollapsed && (
                        <ul id={panelId} className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                          {groupStagings.map((staging) => (
                            <StagingCard
                              key={staging.id}
                              staging={staging}
                              onOpen={() => setSelectedStaging(staging)}
                              onShare={() => setShareStaging(staging)}
                              onReStage={() => handleReStage(staging)}
                              onDelete={() => setDeleteId(staging.id)}
                            />
                          ))}
                        </ul>
                      )}
                    </section>
                  );
                })}
              </div>

              {hasMore && !debouncedSearch && (
                <div className="pt-10 text-center">
                  <button type="button" onClick={loadMore} className={`${SECONDARY_BTN} h-10 px-4`}>
                    Load more
                  </button>
                </div>
              )}

              {groupKeys.length === 0 && debouncedSearch && (
                <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center">
                  <h2 className="font-body text-lg font-semibold tracking-tight">No properties match "{debouncedSearch}"</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Check the spelling, or clear the search to see everything.
                  </p>
                  <button type="button" onClick={() => setSearchQuery("")} className={`${SECONDARY_BTN} mt-5`}>
                    Clear search
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Delete confirmation */}
      <DialogPrimitive.Root open={!!deleteId} onOpenChange={(open) => !open && !deleting && setDeleteId(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/30 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            role="alertdialog"
            className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-6 shadow-soft focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          >
            <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">Delete this photo?</DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
              The edited photo and any share link to it are removed for good. The original stays if other edits use it.
            </DialogPrimitive.Description>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogPrimitive.Close className={`${SECONDARY_BTN} h-10 px-4`} disabled={deleting}>
                Cancel
              </DialogPrimitive.Close>
              <button
                type="button"
                onClick={() => deleteId && handleDelete(deleteId)}
                disabled={deleting}
                className={`inline-flex h-10 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-60 ${FOCUS_RING}`}
              >
                {deleting ? "Deleting…" : "Delete photo"}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {shareStaging && (
        <ShareDialog
          stagingId={shareStaging.id}
          initialToken={shareStaging.share_token}
          onClose={() => setShareStaging(null)}
          onTokenChange={(token) => {
            setStagings((prev) => prev.map((s) => (s.id === shareStaging.id ? { ...s, share_token: token } : s)));
            setShareStaging((prev) => (prev ? { ...prev, share_token: token } : prev));
          }}
        />
      )}

      {shareListingProperty && (
        <ListingShareDialog propertyAddress={shareListingProperty} onClose={() => setShareListingProperty(null)} />
      )}

      {showAgentCard && <AgentProfileDialog onClose={() => setShowAgentCard(false)} />}

      {/* Before/after viewer */}
      <DialogPrimitive.Root open={!!selectedStaging} onOpenChange={(open) => !open && setSelectedStaging(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content className="fixed inset-0 z-50 overflow-y-auto bg-background focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0">
            {selectedStaging && (
              <>
                <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                  <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="min-w-0">
                      <DialogPrimitive.Title className="truncate font-semibold tracking-tight">
                        {selectedStaging.property_address || "No property name"}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description className="truncate text-sm text-muted-foreground">
                        Created {formatDate(selectedStaging.created_at)}
                      </DialogPrimitive.Description>
                    </div>
                    <DialogPrimitive.Close className={`${SECONDARY_BTN} flex-shrink-0`}>
                      <X className="h-4 w-4" aria-hidden />
                      Close
                    </DialogPrimitive.Close>
                  </div>
                </div>
                <BeforeAfterSlider
                  before={selectedStaging.original_image_url}
                  after={selectedStaging.staged_image_url}
                  onReset={() => navigate("/app")}
                  mlsDisclosure={selectedStaging.mls_disclosure}
                  refineContext={{
                    stagingId: selectedStaging.id,
                    tool: isToolId(selectedStaging.kind) ? selectedStaging.kind : undefined,
                    roomType: selectedStaging.room_type,
                    style: selectedStaging.style,
                    propertyName: selectedStaging.property_address,
                    customInstructions: selectedStaging.custom_instructions,
                    palette: selectedStaging.staging_palette || null,
                  }}
                />
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <footer className="border-t border-border px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <p className="font-medium text-foreground">RealVision</p>
          <p>© 2026 RealVision. Virtual staging for real estate photos.</p>
        </div>
      </footer>
    </div>
  );
};

export default Gallery;
