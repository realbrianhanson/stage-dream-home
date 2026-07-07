import { useNavigate } from "react-router-dom";
import Logo from "@/components/Logo";

const MarketingFooter = () => {
  const navigate = useNavigate();
  return (
    <footer className="border-t border-white/[0.04] py-12 px-6 bg-foreground/[0.03]">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <Logo />
        <p className="font-body text-sm text-muted-foreground text-center">
          © 2026 RealVision. AI-powered virtual staging for real estate professionals.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <button onClick={() => navigate("/privacy")} className="font-body text-xs text-muted-foreground hover:text-accent transition-colors">Privacy</button>
          <button onClick={() => navigate("/terms")} className="font-body text-xs text-muted-foreground hover:text-accent transition-colors">Terms</button>
          <button onClick={() => navigate("/pricing")} className="font-body text-xs text-muted-foreground hover:text-accent transition-colors">Pricing</button>
          <a href="mailto:support@realvision.ai" className="font-body text-xs text-muted-foreground hover:text-accent transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
};

export default MarketingFooter;
