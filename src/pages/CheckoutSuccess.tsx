import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import { useUsage } from "@/hooks/useUsage";

const CheckoutSuccess = () => {
  const navigate = useNavigate();
  const { refresh } = useUsage();

  useEffect(() => {
    // Give the webhook a moment to write the new plan, then refresh usage.
    const t = setTimeout(() => { refresh(); }, 1500);
    return () => clearTimeout(t);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background grain-overlay flex flex-col">
      <nav className="px-6 py-4 border-b border-border/10">
        <div className="max-w-7xl mx-auto"><Logo /></div>
      </nav>
      <div className="flex-1 flex items-center justify-center px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.25, 0.4, 0.25, 1] }}
          className="max-w-lg w-full text-center rounded-2xl border border-accent/25 bg-card/40 backdrop-blur-sm p-10 md:p-14 shadow-glow-gold"
        >
          <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-accent/10 border border-accent/25 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-accent" />
          </div>
          <p className="text-accent font-body text-xs tracking-[0.3em] uppercase mb-4">Welcome aboard</p>
          <h1 className="font-display text-4xl md:text-5xl font-medium mb-4 leading-[1.1]">
            You're all <span className="italic text-accent">set.</span>
          </h1>
          <p className="font-body text-muted-foreground mb-8 leading-relaxed">
            Your subscription is active. Your new plan and staging limits will appear in a moment.
          </p>
          <button
            onClick={() => navigate("/app")}
            className="gold-gradient-animated text-accent-foreground font-body font-semibold text-sm px-8 py-3.5 rounded-lg tracking-wide hover:opacity-90 transition-opacity inline-flex items-center gap-2 group"
          >
            Open the App
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;
