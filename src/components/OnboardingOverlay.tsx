import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Palette, Download, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingOverlayProps {
  onComplete: () => void;
  persistDismiss?: boolean;
}

const STEPS = 3;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

const OnboardingOverlay = ({ onComplete, persistDismiss = true }: OnboardingOverlayProps) => {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const dismiss = async () => {
    if (persistDismiss && user) {
      await supabase
        .from("usage")
        .update({ onboarding_complete: true } as any)
        .eq("user_id", user.id);
    }
    onComplete();
  };

  const next = () => {
    if (step === STEPS - 1) {
      dismiss();
    } else {
      setDirection(1);
      setStep((s) => s + 1);
    }
  };

  const howItWorksItems = [
    { icon: Upload, title: "Upload a Photo", desc: "Take a photo of any vacant room with your phone or camera" },
    { icon: Palette, title: "Choose Your Style", desc: "Pick from 6+ professional design styles" },
    { icon: Download, title: "Download & List", desc: "Get your staged photo in under 30 seconds" },
  ];

  const tips = [
    { emoji: "📸", text: "Best results come from well-lit, straight-on photos" },
    { emoji: "🏠", text: "Remove personal items and clutter before photographing" },
    { emoji: "📐", text: "Shoot from a corner to capture more of the room" },
    { emoji: "💡", text: "Daytime photos with natural light work best" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-foreground/90 backdrop-blur-xl"
    >
      {/* Skip */}
      <button
        onClick={dismiss}
        className="absolute top-6 right-6 z-50 font-body text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors flex items-center gap-1"
      >
        Skip <X className="w-3.5 h-3.5" />
      </button>

      <div className="relative max-w-2xl w-full mx-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col items-center text-center"
          >
            {step === 0 && (
              <div className="flex flex-col items-center gap-6">
                <h2 className="font-display text-4xl md:text-5xl font-semibold text-primary-foreground">
                  Welcome to RealVision
                </h2>
                <p className="font-body text-lg text-primary-foreground/70 max-w-md">
                  Let's stage your first room in under 60 seconds
                </p>

                {/* Before → After preview */}
                <div className="relative flex items-center gap-3 mt-4">
                  <div className="w-40 h-28 md:w-52 md:h-36 rounded-lg bg-muted/10 border border-primary-foreground/10 flex items-center justify-center overflow-hidden">
                    <span className="font-body text-xs text-primary-foreground/40 uppercase tracking-wider">Vacant</span>
                  </div>
                  <div className="font-display text-2xl text-accent">→</div>
                  <div className="w-40 h-28 md:w-52 md:h-36 rounded-lg border border-accent/30 shadow-glow-gold flex items-center justify-center overflow-hidden bg-accent/5">
                    <span className="font-body text-xs text-accent uppercase tracking-wider">Staged</span>
                  </div>
                </div>

                <button onClick={next} className="mt-6 gold-gradient-animated text-foreground font-body font-semibold px-8 py-3 rounded-lg text-sm tracking-wide">
                  Let's Go
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="flex flex-col items-center gap-6">
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-primary-foreground">
                  How It Works
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
                  {howItWorksItems.map((item, i) => (
                    <div key={i} className="flex flex-col items-center gap-3 p-5 rounded-xl bg-primary-foreground/5 border border-primary-foreground/10 backdrop-blur-sm">
                      <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-accent" />
                      </div>
                      <span className="font-body text-xs text-accent font-semibold">Step {i + 1}</span>
                      <h3 className="font-display text-lg font-semibold text-primary-foreground">{item.title}</h3>
                      <p className="font-body text-sm text-primary-foreground/60 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
                <button onClick={next} className="mt-4 gold-gradient-animated text-foreground font-body font-semibold px-8 py-3 rounded-lg text-sm tracking-wide">
                  Got It
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="flex flex-col items-center gap-6">
                <h2 className="font-display text-3xl md:text-4xl font-semibold text-primary-foreground">
                  Pro Tips
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 w-full">
                  {tips.map((tip, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-4 rounded-xl bg-primary-foreground/[0.04] border border-primary-foreground/10 backdrop-blur-md"
                    >
                      <span className="text-xl shrink-0">{tip.emoji}</span>
                      <p className="font-body text-sm text-primary-foreground/75 text-left leading-relaxed">{tip.text}</p>
                    </div>
                  ))}
                </div>
                <button onClick={next} className="mt-4 gold-gradient-animated text-foreground font-body font-semibold px-8 py-3 rounded-lg text-sm tracking-wide">
                  Start Staging
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Dot indicators */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {Array.from({ length: STEPS }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === step ? "bg-accent w-5" : "bg-primary-foreground/25"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default OnboardingOverlay;
