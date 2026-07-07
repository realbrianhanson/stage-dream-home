import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";

const CheckoutCancel = () => {
  const navigate = useNavigate();
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
          className="max-w-lg w-full text-center rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-10 md:p-14"
        >
          <p className="text-accent font-body text-xs tracking-[0.3em] uppercase mb-4">No charge</p>
          <h1 className="font-display text-4xl md:text-5xl font-medium mb-4 leading-[1.1]">
            Checkout <span className="italic text-accent">cancelled</span>
          </h1>
          <p className="font-body text-muted-foreground mb-8 leading-relaxed">
            No worries — nothing was charged. You can pick a plan whenever you're ready.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => navigate("/pricing")}
              className="gold-gradient-animated text-accent-foreground font-body font-semibold text-sm px-8 py-3.5 rounded-lg tracking-wide hover:opacity-90 transition-opacity inline-flex items-center gap-2 group"
            >
              Back to Pricing
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate("/app")}
              className="border border-border font-body text-sm px-8 py-3.5 rounded-lg text-muted-foreground hover:border-accent/40 hover:text-accent transition-colors"
            >
              Continue Free
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CheckoutCancel;
