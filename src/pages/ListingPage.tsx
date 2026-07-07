import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, Mail, Phone, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressiveImage } from "@/components/ui/progressive-image";

interface Agent {
  display_name?: string | null;
  brokerage?: string | null;
  phone?: string | null;
  email?: string | null;
  headshot_url?: string | null;
}

interface ListingStaging {
  id: string;
  original_image_url: string;
  staged_image_url: string;
  room_type: string;
  style: string;
  created_at: string;
  mls_disclosure?: boolean;
}

interface ListingPageData {
  property_address: string;
  created_at: string;
  agent: Agent | null;
  stagings: ListingStaging[];
}

const AgentCard = ({ agent, tone = "light" }: { agent: Agent; tone?: "light" | "dark" }) => {
  const hasAny =
    agent.display_name || agent.brokerage || agent.phone || agent.email || agent.headshot_url;
  if (!hasAny) return null;

  const bg = tone === "dark" ? "bg-foreground/[0.03]" : "bg-card/50";

  return (
    <div className={`rounded-2xl border border-border ${bg} p-5 sm:p-6 flex items-center gap-5 backdrop-blur-sm`}>
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-accent/30 bg-muted flex items-center justify-center flex-shrink-0">
        {agent.headshot_url ? (
          <img
            src={agent.headshot_url}
            alt={agent.display_name || "Agent"}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-7 h-7 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {agent.display_name && (
          <p className="font-display text-lg sm:text-xl font-medium leading-tight">
            {agent.display_name}
          </p>
        )}
        {agent.brokerage && (
          <p className="font-body text-xs sm:text-sm text-muted-foreground mt-0.5">
            {agent.brokerage}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
          {agent.phone && (
            <a
              href={`tel:${agent.phone.replace(/\s+/g, "")}`}
              className="font-body text-xs sm:text-sm text-foreground/80 hover:text-accent transition-colors inline-flex items-center gap-1.5"
            >
              <Phone className="w-3 h-3" />
              {agent.phone}
            </a>
          )}
          {agent.email && (
            <a
              href={`mailto:${agent.email}`}
              className="font-body text-xs sm:text-sm text-foreground/80 hover:text-accent transition-colors inline-flex items-center gap-1.5"
            >
              <Mail className="w-3 h-3" />
              {agent.email}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

const ListingPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ListingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<ListingStaging | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: rows, error } = await supabase.rpc(
        "get_listing_page" as any,
        { p_token: token } as any
      );
      const row = Array.isArray(rows) ? rows[0] : null;
      if (error || !row) {
        setNotFound(true);
      } else {
        setData(row as ListingPageData);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background grain-overlay">
        <div className="border-b border-border/40 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-16 space-y-8">
          <div className="text-center space-y-3">
            <Skeleton className="h-3 w-24 mx-auto rounded-full" />
            <Skeleton className="h-10 md:h-14 w-2/3 mx-auto" />
          </div>
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="aspect-[4/3] w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen bg-background grain-overlay flex flex-col items-center justify-center p-6 text-center">
        <p className="text-accent font-body text-xs tracking-[0.3em] uppercase mb-4">404</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium mb-3">
          Listing <span className="italic text-accent">not found</span>
        </h1>
        <p className="font-body text-muted-foreground mb-8 max-w-md">
          This listing microsite is no longer available. The agent may have revoked the link.
        </p>
        <button
          onClick={() => navigate("/")}
          className="gold-gradient-animated text-accent-foreground font-body font-semibold text-sm px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
        >
          Visit RealVision
        </button>
      </div>
    );
  }

  const agent = data.agent || {};
  const stagings = data.stagings || [];

  return (
    <div className="min-h-screen bg-background grain-overlay">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 px-6 py-4 backdrop-blur-md bg-foreground/40 border-b border-border/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")}>
            <Logo light />
          </button>
          <button
            onClick={() => navigate("/auth")}
            className="font-body text-sm font-semibold gold-gradient text-accent-foreground px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Try It Free
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="pt-28 pb-8 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-3 h-3 text-accent" />
            <span className="font-body text-[10px] tracking-[0.2em] uppercase text-accent">
              Virtual Listing Tour
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-medium mb-3 max-w-3xl mx-auto">
            {data.property_address}
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            {stagings.length} staged room{stagings.length !== 1 ? "s" : ""}
          </p>
        </motion.div>
      </div>

      {/* Top agent card */}
      {(agent.display_name || agent.brokerage || agent.phone || agent.email || agent.headshot_url) && (
        <div className="px-6 mb-10">
          <div className="max-w-2xl mx-auto">
            <AgentCard agent={agent} />
          </div>
        </div>
      )}

      {/* Rooms grid */}
      <div className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          {stagings.length === 0 ? (
            <p className="text-center font-body text-sm text-muted-foreground py-20">
              No staged rooms yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stagings.map((s, i) => (
                <motion.button
                  key={s.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  onClick={() => setSelected(s)}
                  className="group text-left relative rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-accent/25 hover:-translate-y-0.5 transition-all duration-500"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <ProgressiveImage
                      src={s.staged_image_url}
                      alt={`${s.room_type} - ${s.style}`}
                      wrapperClassName="absolute inset-0"
                      className="group-hover:scale-[1.05] transition-transform duration-[1200ms] ease-[cubic-bezier(0.25,0.4,0.25,1)]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/10 to-transparent transition-opacity duration-500 group-hover:from-foreground/85" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className="inline-block w-1 h-1 rounded-full bg-accent"
                          style={{ boxShadow: "0 0 8px hsl(38 60% 55% / 0.6)" }}
                        />
                        <p className="font-body text-[10px] tracking-[0.25em] uppercase text-accent">
                          {s.style}
                        </p>
                      </div>
                      <p className="font-display text-xl text-primary-foreground font-medium leading-tight capitalize">
                        {s.room_type}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom agent card */}
      {(agent.display_name || agent.brokerage || agent.phone || agent.email || agent.headshot_url) && (
        <div className="px-6 pb-20">
          <div className="max-w-2xl mx-auto">
            <p className="text-accent font-body text-[10px] tracking-[0.3em] uppercase text-center mb-4">
              Contact
            </p>
            <AgentCard agent={agent} tone="dark" />
          </div>
        </div>
      )}

      {/* Bottom RealVision CTA */}
      <section className="py-16 px-6 border-t border-border bg-card/40">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-2xl md:text-3xl font-medium mb-3">
            Stage <span className="italic text-accent">your own</span> listings
          </h2>
          <p className="font-body text-sm text-muted-foreground mb-6">
            Transform vacant rooms into stunning staged spaces in under 30 seconds.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="gold-gradient-animated text-accent-foreground font-body font-semibold text-sm px-8 py-3 rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2 group"
          >
            Start Staging Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      <footer className="border-t border-border py-6 px-6 bg-card/40 text-center">
        <button
          onClick={() => navigate("/")}
          className="font-body text-xs text-muted-foreground/70 hover:text-accent transition-colors"
        >
          Staged with RealVision
        </button>
      </footer>

      {/* Before/After modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-foreground/80 backdrop-blur-md overflow-y-auto"
          >
            <button
              onClick={() => setSelected(null)}
              className="fixed top-6 right-6 z-50 w-10 h-10 rounded-full bg-foreground/60 hover:bg-foreground/80 text-primary-foreground flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="pt-16 pb-10 px-4">
              <p className="text-center text-accent font-body text-[10px] tracking-[0.3em] uppercase mb-2">
                {selected.style}
              </p>
              <h3 className="text-center font-display text-2xl md:text-3xl font-medium text-primary-foreground mb-6 capitalize">
                {selected.room_type}
              </h3>
              <BeforeAfterSlider
                before={selected.original_image_url}
                after={selected.staged_image_url}
                mlsDisclosure={selected.mls_disclosure}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ListingPage;
