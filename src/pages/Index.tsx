import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import RoomUploader from "@/components/RoomUploader";
import type { StagingMeta, StagingResult } from "@/components/RoomUploader";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import ComparisonView from "@/components/ComparisonView";
import UsageIndicator from "@/components/UsageIndicator";
import OnboardingOverlay from "@/components/OnboardingOverlay";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";
import { useUsage } from "@/hooks/useUsage";
import { supabase } from "@/integrations/supabase/client";
import { openCustomerPortal } from "@/lib/billing";
import { LogOut, Images, HelpCircle, CreditCard } from "lucide-react";

/** Extra context RoomUploader can pass when a multi-image run starts. */
export interface MultiRunMeta {
  roomType?: string;
  style?: string;
}

type ResultState =
  | { type: "single"; original: string; staged: string; isWatermarked?: boolean; mlsDisclosure?: boolean; meta?: StagingMeta }
  | { type: "multi"; original: string; results: StagingResult[]; pendingStyles: string[]; isWatermarked?: boolean; meta?: MultiRunMeta }
  | null;

interface ReStageState {
  reStageImage?: string;
  reStageRoomType?: string;
  reStageStyle?: string;
  reStageCustomInstructions?: string;
  reStagePalette?: string;
}

const navItem =
  "inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-card transition-colors";

const AccountMenu = ({ email, isPaid, onSignOut }: { email?: string; isPaid: boolean; onSignOut: () => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = (email?.[0] ?? "?").toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        className="w-9 h-9 rounded-full border border-border bg-card text-sm font-medium text-foreground flex items-center justify-center hover:border-foreground/30"
      >
        {initial}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-60 rounded-lg border border-border bg-background shadow-soft py-1.5 z-50">
          {email && <p className="px-3 py-2 text-xs text-muted-foreground truncate border-b border-border mb-1">{email}</p>}
          {isPaid && (
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                void openCustomerPortal();
              }}
              className="w-full flex items-center gap-2 px-3 h-9 text-sm text-left hover:bg-card"
            >
              <CreditCard className="w-4 h-4 text-muted-foreground" aria-hidden />
              Manage billing
            </button>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={onSignOut}
            className="w-full flex items-center gap-2 px-3 h-9 text-sm text-left hover:bg-card"
          >
            <LogOut className="w-4 h-4 text-muted-foreground" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
};

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { usage, canStage, refresh, freeLimit, planLimit, remainingStagings, loading: usageLoading } = useUsage();
  const [result, setResult] = useState<ResultState>(null);
  const [stagingCount, setStagingCount] = useState(0);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const isPaid = !!usage && usage.plan !== "free" && usage.plan !== "admin";

  // Show onboarding for first-time users
  useEffect(() => {
    if (!usageLoading && usage && !usage.onboarding_complete) setShowOnboarding(true);
  }, [usageLoading, usage]);

  const reStageState = location.state as ReStageState | null;

  // Wait for the session so the count isn't fetched (and zeroed) before auth is ready.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("stagings")
      .select("id", { count: "exact", head: true })
      .then(({ count, error }) => {
        if (error) console.error("Staging count failed:", error);
        if (!cancelled) setStagingCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!reStageState?.reStageImage) return;
    const t = setTimeout(() => document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" }), 300);
    return () => clearTimeout(t);
  }, [reStageState]);

  const handleResult = (original: string, staged: string, isWatermarked?: boolean, mlsDisclosure?: boolean, meta?: StagingMeta) => {
    setResult({ type: "single", original, staged, isWatermarked, mlsDisclosure, meta });
    setStagingCount((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleMultiStart = useCallback((original: string, pendingStyles: string[], meta?: MultiRunMeta) => {
    setResult({ type: "multi", original, results: [], pendingStyles, isWatermarked: false, meta });
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
    if (newResult.stagedImageUrl) setStagingCount((prev) => prev + 1);
  }, []);

  const resetResult = () => {
    setResult(null);
    window.scrollTo({ top: 0 });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AnimatePresence>
        {showOnboarding && (
          <OnboardingOverlay onComplete={() => setShowOnboarding(false)} persistDismiss={!usage?.onboarding_complete} />
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto h-14 sm:h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          <Link to="/app" onClick={resetResult} aria-label="RealVision studio" className="rounded-md">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Account">
            {usage && (
              <div className="mr-1 sm:mr-3 min-w-0">
                <UsageIndicator plan={usage.plan} used={usage.stagings_this_month} limit={planLimit} monthResetAt={usage.month_reset_at} />
              </div>
            )}
            <button type="button" onClick={() => navigate("/gallery")} className={navItem} aria-label="My stagings">
              <Images className="w-4 h-4" aria-hidden />
              <span className="hidden sm:inline">My stagings</span>
              {stagingCount > 0 && <span className="hidden sm:inline tabular-nums text-muted-foreground/80">{stagingCount}</span>}
            </button>
            <button type="button" onClick={() => setShowOnboarding(true)} className={`${navItem} w-9 justify-center px-0`} aria-label="How it works">
              <HelpCircle className="w-4 h-4" aria-hidden />
            </button>
            <AccountMenu email={user?.email} isPaid={isPaid} onSignOut={handleSignOut} />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {result?.type === "single" ? (
          <BeforeAfterSlider
            before={result.original}
            after={result.staged}
            onReset={resetResult}
            isWatermarked={result.isWatermarked}
            mlsDisclosure={result.mlsDisclosure}
            refineContext={
              result.meta
                ? {
                    stagingId: result.meta.stagingId,
                    tool: result.meta.tool,
                    roomType: result.meta.roomType,
                    style: result.meta.style,
                    propertyName: result.meta.propertyName,
                    customInstructions: result.meta.customInstructions,
                    palette: result.meta.palette,
                  }
                : undefined
            }
          />
        ) : result?.type === "multi" ? (
          <ComparisonView
            original={result.original}
            results={result.results}
            pendingStyles={result.pendingStyles}
            onReset={resetResult}
            isWatermarked={result.isWatermarked}
            roomType={result.meta?.roomType}
            baseStyle={result.meta?.style}
          />
        ) : (
          <RoomUploader
            onResult={handleResult}
            onMultiStart={handleMultiStart}
            onMultiProgress={handleMultiProgress}
            initialImage={reStageState?.reStageImage}
            initialRoomType={reStageState?.reStageRoomType}
            initialStyle={reStageState?.reStageStyle}
            initialCustomInstructions={reStageState?.reStageCustomInstructions}
            initialPalette={reStageState?.reStagePalette}
            canStage={canStage}
            remainingStagings={remainingStagings}
            onStagingComplete={refresh}
            usage={usage}
            freeLimit={freeLimit}
          />
        )}
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <p>© 2026 RealVision</p>
          <div className="flex items-center gap-5">
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
