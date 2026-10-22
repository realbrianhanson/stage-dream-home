import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Upload, SlidersHorizontal, Download, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingOverlayProps {
  onComplete: () => void;
  persistDismiss?: boolean;
}

const STEPS = [
  {
    icon: Upload,
    title: "Upload a room photo",
    desc: "Any listing photo works. Shoot straight on, in daylight, from a corner if you can.",
  },
  {
    icon: SlidersHorizontal,
    title: "Pick a tool",
    desc: "Stage an empty room, remove furniture, declutter, or fix the sky, lawn or light outside.",
  },
  {
    icon: Download,
    title: "Download for MLS",
    desc: "Results take about a minute. Refine them, then download in MLS, web or social sizes.",
  },
];

/** Short first-run intro. Shown once, and again from the help button. */
const OnboardingOverlay = ({ onComplete, persistDismiss = true }: OnboardingOverlayProps) => {
  const { user } = useAuth();
  const startRef = useRef<HTMLButtonElement>(null);

  const dismiss = async () => {
    onComplete();
    if (!persistDismiss || !user) return;
    const { error } = await supabase.from("usage").update({ onboarding_complete: true }).eq("user_id", user.id);
    if (error) {
      console.error("Could not save onboarding state:", error);
      toast.error("Couldn't save that. You may see this intro again next time.");
    }
  };

  useEffect(() => {
    startRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") void dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-foreground/30 p-4"
      onClick={() => void dismiss()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-xl border border-border bg-background shadow-soft p-6 sm:p-8"
      >
        <button
          type="button"
          onClick={() => void dismiss()}
          aria-label="Close intro"
          className="absolute top-3 right-3 w-9 h-9 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-card"
        >
          <X className="w-4 h-4" aria-hidden />
        </button>

        <h2 id="onboarding-title" className="text-2xl font-semibold tracking-tight pr-8">
          Welcome to RealVision
        </h2>
        <p className="mt-1.5 text-muted-foreground">Three steps from a listing photo to a finished image.</p>

        <ol className="mt-6 space-y-4">
          {STEPS.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex gap-3.5">
              <span className="w-9 h-9 shrink-0 rounded-md bg-accent-soft text-accent flex items-center justify-center">
                <Icon className="w-4 h-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-medium">{title}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            </li>
          ))}
        </ol>

        <button
          ref={startRef}
          type="button"
          onClick={() => void dismiss()}
          className="gold-gradient-animated mt-7 w-full h-11 rounded-md font-medium"
        >
          Stage my first photo
        </button>
      </div>
    </motion.div>
  );
};

export default OnboardingOverlay;
