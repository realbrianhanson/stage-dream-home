import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Trash2, X, Upload, ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

interface Staging {
  id: string;
  original_image_url: string;
  staged_image_url: string;
  room_type: string;
  style: string;
  property_address: string | null;
  created_at: string;
}

const Gallery = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [stagings, setStagings] = useState<Staging[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaging, setSelectedStaging] = useState<Staging | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const fetchStagings = async () => {
    const { data, error } = await supabase
      .from("stagings")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching stagings:", error);
      toast.error("Failed to load your staging history");
    } else {
      setStagings(data || []);
      setCount(data?.length || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStagings();
  }, []);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("stagings").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete staging");
    } else {
      setStagings((prev) => prev.filter((s) => s.id !== id));
      setCount((prev) => prev - 1);
      toast.success("Staging deleted");
    }
    setDeleteId(null);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-foreground/40 border-b border-border/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/app")}
              className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Stage a Room
            </button>
            <button
              onClick={() => signOut()}
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
              {count > 0
                ? `${count} staged room${count !== 1 ? "s" : ""}`
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stagings.map((staging, i) => (
                <motion.div
                  key={staging.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
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

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(staging.id);
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-foreground/60 hover:bg-destructive/80 text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              ))}
            </div>
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
