import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Trash2, X, Upload, ArrowLeft, LogOut, Download, RefreshCw, Search, ChevronDown, ChevronRight, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUsage } from "@/hooks/useUsage";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import UsageIndicator from "@/components/UsageIndicator";
import ShareDialog from "@/components/ShareDialog";

interface Staging {
  id: string;
  original_image_url: string;
  staged_image_url: string;
  room_type: string;
  style: string;
  property_address: string | null;
  custom_instructions: string | null;
  created_at: string;
  share_token: string | null;
}

const Gallery = () => {
  const { signOut } = useAuth();
  const { usage, freeLimit } = useUsage();
  const navigate = useNavigate();
  const [stagings, setStagings] = useState<Staging[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaging, setSelectedStaging] = useState<Staging | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareStaging, setShareStaging] = useState<Staging | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 300);
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
      toast.error("Failed to load your staging history");
    } else {
      const rows = data || [];
      setStagings((prev) => append ? [...prev, ...rows] : rows);
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
    // Find the staging to get storage paths before deleting
    const staging = stagings.find((s) => s.id === id);
    
    // Delete storage objects first to avoid orphaned files
    if (staging) {
      const extractPath = (url: string) => {
        try {
          const match = url.match(/\/storage\/v1\/object\/public\/stagings\/(.+)$/);
          return match?.[1] ?? null;
        } catch { return null; }
      };
      const origPath = extractPath(staging.original_image_url);
      const stagedPath = extractPath(staging.staged_image_url);
      const filesToRemove = [origPath, stagedPath].filter(Boolean) as string[];
      if (filesToRemove.length > 0) {
        await supabase.storage.from("stagings").remove(filesToRemove);
      }
    }

    const { error } = await supabase.from("stagings").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete staging");
    } else {
      setStagings((prev) => prev.filter((s) => s.id !== id));
      toast.success("Staging deleted");
    }
    setDeleteId(null);
  };

  const handleReStage = (staging: Staging) => {
    navigate("/app", {
      state: {
        reStageImage: staging.original_image_url,
        reStageRoomType: staging.room_type,
        reStageStyle: staging.style,
        reStageCustomInstructions: staging.custom_instructions || "",
      },
    });
  };

  const handleBulkDownload = async (groupStagings: Staging[]) => {
    toast.info(`Downloading ${groupStagings.length} image${groupStagings.length > 1 ? "s" : ""}...`);
    for (const staging of groupStagings) {
      const link = document.createElement("a");
      link.href = staging.staged_image_url;
      link.download = `${staging.room_type}-${staging.style}-${staging.id.slice(0, 8)}.png`;
      link.click();
      await new Promise((r) => setTimeout(r, 500));
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const grouped = useMemo(() => {
    const filtered = debouncedSearch.trim()
      ? stagings.filter((s) =>
          (s.property_address || "Unlabeled")
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase())
        )
      : stagings;

    const groups: Record<string, Staging[]> = {};
    for (const s of filtered) {
      const key = s.property_address?.trim() || "Unlabeled";
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    }
    return groups;
  }, [stagings, debouncedSearch]);

  const totalCount = stagings.length;
  const groupKeys = Object.keys(grouped);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-foreground/40 border-b border-border/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            {usage && (
              <UsageIndicator
                plan={usage.plan}
                used={usage.stagings_this_month}
                limit={freeLimit}
              />
            )}
            <button
              onClick={() => navigate("/app")}
              className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Stage a Room
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <p className="text-accent font-body text-xs tracking-[0.3em] uppercase mb-4">
              Your Portfolio
            </p>
            <h1 className="font-display text-4xl md:text-5xl font-medium mb-3">
              Staging <span className="italic text-accent">Gallery</span>
            </h1>
            <p className="font-body text-muted-foreground">
              {totalCount > 0
                ? `${totalCount} staged room${totalCount !== 1 ? "s" : ""} across ${groupKeys.length} ${groupKeys.length === 1 ? "property" : "properties"}`
                : "Your staging history will appear here"}
            </p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            </div>
          ) : stagings.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <Upload className="w-16 h-16 mx-auto mb-6 text-muted-foreground/40" />
              <h2 className="font-display text-2xl font-medium mb-3">
                No staged rooms yet
              </h2>
              <p className="font-body text-muted-foreground mb-8">
                Upload a vacant room photo and let AI transform it
              </p>
              <button
                onClick={() => navigate("/app")}
                className="gold-gradient-animated text-accent-foreground font-body font-semibold text-sm px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
              >
                Stage Your First Room
              </button>
            </motion.div>
          ) : (
            <>
              {/* Search bar */}
              <div className="mb-8 max-w-md mx-auto">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by property name..."
                    className="w-full font-body text-sm bg-white/[0.02] border border-white/[0.08] rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all placeholder:text-muted-foreground/50"
                  />
                </div>
              </div>

              {/* Grouped sections */}
              <div className="space-y-8">
                {groupKeys.map((groupName) => {
                  const groupStagings = grouped[groupName];
                  const isCollapsed = collapsedGroups.has(groupName);

                  return (
                    <motion.div
                      key={groupName}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {/* Group header */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => toggleGroup(groupName)}
                          className="flex items-center gap-2 group"
                        >
                          {isCollapsed ? (
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                          <h2 className="font-display text-xl font-medium group-hover:text-accent transition-colors">
                            {groupName}
                          </h2>
                          <span className="text-[11px] font-body font-semibold bg-accent/15 text-accent border border-accent/20 rounded-full px-2 py-0.5 leading-none">
                            {groupStagings.length}
                          </span>
                        </button>
                        <button
                          onClick={() => handleBulkDownload(groupStagings)}
                          className="font-body text-xs text-muted-foreground hover:text-accent border border-white/[0.06] hover:border-accent/30 rounded-lg px-3 py-1.5 flex items-center gap-1.5 transition-all"
                        >
                          <Download className="w-3 h-3" />
                          Download All
                        </button>
                      </div>

                      {/* Divider */}
                      <div className="mb-4" style={{ height: '1px', background: 'linear-gradient(90deg, hsl(38 60% 55% / 0.1), transparent)' }} />

                      {/* Cards grid */}
                      <AnimatePresence>
                        {!isCollapsed && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-hidden"
                          >
                            {groupStagings.map((staging, i) => (
                              <motion.div
                                key={staging.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                                className="group relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-accent/15 hover:shadow-dramatic transition-all duration-500 cursor-pointer"
                                onClick={() => setSelectedStaging(staging)}
                              >
                                <div className="aspect-[4/3] relative overflow-hidden">
                                  <img
                                    src={staging.staged_image_url}
                                    alt={`${staging.room_type} - ${staging.style}`}
                                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                                    loading="lazy"
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
                                  <div className="absolute bottom-4 left-4 right-4">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="inline-block w-1 h-1 rounded-full bg-accent" />
                                      <p className="font-body text-xs tracking-[0.2em] uppercase text-accent">
                                        {staging.style}
                                      </p>
                                    </div>
                                    <p className="font-display text-lg text-primary-foreground font-medium">
                                      {staging.room_type}
                                    </p>
                                    <p className="font-body text-xs text-primary-foreground/50 mt-0.5">
                                      {formatDate(staging.created_at)}
                                    </p>
                                  </div>
                                </div>

                                {/* Action buttons */}
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReStage(staging);
                                    }}
                                    className="w-8 h-8 rounded-full bg-foreground/60 hover:bg-accent/80 text-primary-foreground flex items-center justify-center"
                                    title="Re-stage with different style"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteId(staging.id);
                                    }}
                                    className="w-8 h-8 rounded-full bg-foreground/60 hover:bg-destructive/80 text-primary-foreground flex items-center justify-center"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>

              {/* Load more button */}
              {hasMore && !debouncedSearch && (
                <div className="text-center pt-8">
                  <button
                    onClick={loadMore}
                    className="font-body text-sm text-muted-foreground hover:text-accent border border-white/[0.06] hover:border-accent/30 rounded-lg px-6 py-2.5 transition-all"
                  >
                    Load More
                  </button>
                </div>
              )}

              {groupKeys.length === 0 && debouncedSearch && (
                <div className="text-center py-16">
                  <p className="font-body text-muted-foreground">No properties matching "{debouncedSearch}"</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setDeleteId(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background border border-white/[0.06] rounded-2xl p-8 max-w-sm w-full text-center"
            >
              <h3 className="font-display text-xl font-medium mb-2">Delete Staging?</h3>
              <p className="font-body text-sm text-muted-foreground mb-6">
                This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 font-body text-sm font-semibold py-3 rounded-lg border border-border hover:border-accent/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteId)}
                  className="flex-1 font-body text-sm font-semibold py-3 rounded-lg bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Before/After modal */}
      <AnimatePresence>
        {selectedStaging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/80 backdrop-blur-md overflow-y-auto"
          >
            <button
              onClick={() => setSelectedStaging(null)}
              className="fixed top-6 right-6 z-50 w-10 h-10 rounded-full bg-foreground/60 hover:bg-foreground/80 text-primary-foreground flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <BeforeAfterSlider
              before={selectedStaging.original_image_url}
              after={selectedStaging.staged_image_url}
              onReset={() => setSelectedStaging(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-8 px-6 bg-foreground/[0.03]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-display text-lg font-medium">RealVision</p>
          <p className="font-body text-sm text-muted-foreground">
            © 2026 RealVision. AI-powered virtual staging for real estate.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Gallery;
