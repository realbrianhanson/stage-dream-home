import { useState, useRef } from "react";
import HeroSection from "@/components/HeroSection";
import RoomUploader from "@/components/RoomUploader";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";

const Index = () => {
  const [result, setResult] = useState<{ original: string; staged: string } | null>(null);
  const uploadRef = useRef<HTMLDivElement>(null);

  const scrollToUpload = () => {
    document.getElementById("upload-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleResult = (original: string, staged: string) => {
    setResult({ original, staged });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-primary-foreground">
            StageAI
          </h2>
          <button
            onClick={scrollToUpload}
            className="font-body text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
          >
            Get Started →
          </button>
        </div>
      </nav>

      {result ? (
        <div className="pt-20">
          <BeforeAfterSlider
            before={result.original}
            after={result.staged}
            onReset={() => setResult(null)}
          />
        </div>
      ) : (
        <>
          <HeroSection onGetStarted={scrollToUpload} />
          <RoomUploader onResult={handleResult} />
        </>
      )}

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-display text-lg font-medium">StageAI</p>
          <p className="font-body text-sm text-muted-foreground">
            © 2026 StageAI. AI-powered virtual staging for real estate.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
