import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

const MarketingNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const isLanding = location.pathname === "/";

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const forceSolid = !isLanding;
  const solid = forceSolid || scrolled;

  const goAnchor = (hash: string) => {
    if (isLanding) {
      const el = document.querySelector(hash);
      el?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/" + hash);
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 transition-all duration-300 border-b border-border/10 ${
        solid ? "py-3 backdrop-blur-xl bg-foreground/95" : "py-4 sm:py-5 backdrop-blur-md bg-background/20"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        <button onClick={() => navigate("/")} className="shrink-0">
          <Logo light />
        </button>
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => goAnchor("#features")}
            className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors hidden lg:inline"
          >
            Features
          </button>
          <button
            onClick={() => goAnchor("#showcase")}
            className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors hidden lg:inline"
          >
            Showcase
          </button>
          <button
            onClick={() => navigate("/pricing")}
            className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors hidden md:inline"
          >
            Pricing
          </button>
          <button
            onClick={() => navigate(user ? "/app" : "/auth")}
            className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors hidden sm:inline"
          >
            {user ? "Open App" : "Sign In"}
          </button>
          <button
            onClick={() => navigate(user ? "/app" : "/auth")}
            className="font-body text-xs sm:text-sm font-semibold gold-gradient text-accent-foreground px-4 sm:px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            {user ? "Open App" : "Get Started"}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default MarketingNav;
