import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

interface SharedStaging {
  id: string;
  original_image_url: string;
  staged_image_url: string;
  room_type: string;
  style: string;
  property_address: string | null;
  created_at: string;
}

const SharedStagingPage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [staging, setStaging] = useState<SharedStaging | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("stagings")
        .select("id, original_image_url, staged_image_url, room_type, style, property_address, created_at")
        .eq("share_token", token)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
      } else {
        setStaging(data);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !staging) {
    return (
      <div className="min-h-screen bg-background grain-overlay flex flex-col items-center justify-center p-6 text-center">
        <p className="text-accent font-body text-xs tracking-[0.3em] uppercase mb-4">404</p>
        <h1 className="font-display text-4xl md:text-5xl font-medium mb-3">
          Link <span className="italic text-accent">not found</span>
        </h1>
        <p className="font-body text-muted-foreground mb-8 max-w-md">
          This shared staging is no longer available. The owner may have revoked the link.
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

  return (
    <div className="min-h-screen bg-background grain-overlay">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-foreground/40 border-b border-border/10">
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
      <div className="pt-28 pb-6 px-6 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 rounded-full px-4 py-1.5 mb-4">
            <Sparkles className="w-3 h-3 text-accent" />
            <span className="font-body text-[10px] tracking-[0.2em] uppercase text-accent">AI-Staged with RealVision</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-medium mb-2">
            {staging.property_address || `${staging.room_type}`}
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            <span className="capitalize">{staging.room_type}</span> · <span className="capitalize">{staging.style}</span> style
          </p>
        </motion.div>
      </div>

      {/* Before/After */}
      <BeforeAfterSlider
        before={staging.original_image_url}
        after={staging.staged_image_url}
      />

      {/* CTA */}
      <section className="py-20 px-6 bg-card/40 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-medium mb-4">
            Stage <span className="italic text-accent">your own</span> listings
          </h2>
          <p className="font-body text-muted-foreground mb-8">
            Transform vacant rooms into stunning staged spaces in under 30 seconds. Try 3 stagings free.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="gold-gradient-animated text-accent-foreground font-body font-semibold text-base px-10 py-4 rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2 group"
          >
            Start Staging Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6 bg-card/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="font-body text-sm text-muted-foreground">
            © 2026 RealVision. AI-powered virtual staging.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default SharedStagingPage;
