import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import RoomUploader from "@/components/RoomUploader";
import type { StagingResult } from "@/components/RoomUploader";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import ComparisonView from "@/components/ComparisonView";
import UsageIndicator from "@/components/UsageIndicator";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useUsage } from "@/hooks/useUsage";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ImageIcon, HelpCircle } from "lucide-react";

type ResultState =
  | { type: "single"; original: string; staged: string; isWatermarked?: boolean }
  | { type: "multi"; original: string; results: StagingResult[]; pendingStyles: string[]; isWatermarked?: boolean }
  | null;

const Index = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { usage, canStage, increment, freeLimit, remainingStagings, loading: usageLoading } = useUsage();
  const [result, setResult] = useState<ResultState>(null);
  const [stagingCount, setStagingCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Show onboarding for first-time users
  useEffect(() => {
    if (!usageLoading && usage && !(usage as any).onboarding_complete) {
      setShowOnboarding(true);
    }
  }, [usageLoading, usage]);

  const reStageState = location.state as {
    reStageImage?: string;
    reStageRoomType?: string;
    reStageStyle?: string;
    reStageCustomInstructions?: string;
  } | null;

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("stagings")
        .select("*", { count: "exact", head: true });
      setStagingCount(count || 0);
    };
    fetchCount();
  }, []);

  useEffect(() => {
    if (reStageState?.reStageImage) {
      setTimeout(() => {
        document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [reStageState]);

  const scrollToUpload = () => {
    document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleResult = (original: string, staged: string, isWatermarked?: boolean) => {
    setResult({ type: "single", original, staged, isWatermarked });
    setStagingCount((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMultiStart = useCallback((original: string, pendingStyles: string[]) => {
    setResult({ type: "multi", original, results: [], pendingStyles, isWatermarked: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleMultiProgress = useCallback((newResult: StagingResult, remainingStyles: string[]) => {
    setResult((prev) => {
      if (!prev || prev.type !== "multi") return prev;
      return {
        ...prev,
        results: [...prev.results, newResult],
        pendingStyles: remainingStyles,
        isWatermarked: prev.isWatermarked || newResult.isWatermarked,
      };
    });
    setStagingCount((prev) => prev + 1);
  }, []);

  const handleMultiResult = (original: string, results: StagingResult[], isWatermarked?: boolean) => {
    setResult({ type: "multi", original, results, pendingStyles: [], isWatermarked });
    setStagingCount((prev) => prev + results.length);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingOverlay
            onComplete={() => setShowOnboarding(false)}
            persistDismiss={!(usage as any)?.onboarding_complete}
          />
        )}
      </AnimatePresence>
      <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-md bg-foreground/40 border-b border-border/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <Logo light />
          <div className="flex items-center gap-2 sm:gap-4">
            {usage && (
              <div className="hidden sm:block">
                <UsageIndicator
                  plan={usage.plan}
                  used={usage.stagings_this_month}
                  limit={freeLimit}
                />
              </div>
            )}
            <button
              onClick={scrollToUpload}
              className="hidden md:inline font-body text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              Get Started →
            </button>
            <button
              onClick={() => navigate("/gallery")}
              className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors flex items-center gap-1.5 min-h-[44px] px-1"
              aria-label="My Stagings"
            >
              <ImageIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">My Stagings</span>
              {stagingCount > 0 && (
                <span className="ml-1 text-[10px] font-semibold bg-accent/20 text-accent border border-accent/30 rounded-full px-1.5 py-0.5 leading-none">
                  {stagingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setShowOnboarding(true)}
              className="font-body text-primary-foreground/50 hover:text-primary-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Help & Tour"
              aria-label="Help & Tour"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="font-body text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors flex items-center gap-1.5 min-h-[44px] px-1"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {result?.type === "single" ? (
        <div className="pt-20">
          <BeforeAfterSlider
            before={result.original}
            after={result.staged}
            onReset={() => setResult(null)}
            isWatermarked={result.isWatermarked}
          />
        </div>
      ) : result?.type === "multi" ? (
        <ComparisonView
          original={result.original}
          results={result.results}
          pendingStyles={result.pendingStyles}
          onReset={() => setResult(null)}
          isWatermarked={result.isWatermarked}
        />
      ) : (
        <>
          <HeroSection onGetStarted={scrollToUpload} />
          <RoomUploader
            onResult={handleResult}
            onMultiResult={handleMultiResult}
            onMultiStart={handleMultiStart}
            onMultiProgress={handleMultiProgress}
            initialImage={reStageState?.reStageImage}
            initialRoomType={reStageState?.reStageRoomType}
            initialStyle={reStageState?.reStageStyle}
            initialCustomInstructions={reStageState?.reStageCustomInstructions}
            canStage={canStage}
            remainingStagings={remainingStagings}
            onStagingComplete={increment}
            usage={usage}
            freeLimit={freeLimit}
          />
        </>
      )}

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

export default Index;
