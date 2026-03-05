import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import HeroSection from "@/components/HeroSection";
import RoomUploader from "@/components/RoomUploader";
import type { StagingResult } from "@/components/RoomUploader";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import ComparisonView from "@/components/ComparisonView";
import UsageIndicator from "@/components/UsageIndicator";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useUsage } from "@/hooks/useUsage";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ImageIcon } from "lucide-react";

type ResultState =
  | { type: "single"; original: string; staged: string }
  | { type: "multi"; original: string; results: StagingResult[] }
  | null;

const Index = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { usage, canStage, increment, freeLimit, remainingStagings, loading: usageLoading } = useUsage();
  const [result, setResult] = useState<ResultState>(null);
  const [stagingCount, setStagingCount] = useState(0);

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

  const handleResult = (original: string, staged: string) => {
    setResult({ type: "single", original, staged });
    setStagingCount((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMultiResult = (original: string, results: StagingResult[]) => {
    setResult({ type: "multi", original, results });
    setStagingCount((prev) => prev + results.length);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-md bg-foreground/40 border-b border-border/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo light />
          <div className="flex items-center gap-4">
            {usage && (
              <UsageIndicator
                plan={usage.plan}
                used={usage.stagings_this_month}
                limit={freeLimit}
              />
            )}
            <button
              onClick={scrollToUpload}
              className="font-body text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
            >
              Get Started →
            </button>
            <button
              onClick={() => navigate("/gallery")}
              className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              My Stagings
              {stagingCount > 0 && (
                <span className="ml-1 text-[10px] font-semibold bg-accent/20 text-accent border border-accent/30 rounded-full px-1.5 py-0.5 leading-none">
                  {stagingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => signOut()}
              className="font-body text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
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
          />
        </div>
      ) : result?.type === "multi" ? (
        <ComparisonView
          original={result.original}
          results={result.results}
          onReset={() => setResult(null)}
        />
      ) : (
        <>
          <HeroSection onGetStarted={scrollToUpload} />
          <RoomUploader
            onResult={handleResult}
            onMultiResult={handleMultiResult}
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
