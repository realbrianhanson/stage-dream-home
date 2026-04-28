import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
    document.title = "Page Not Found — RealVision";
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background grain-overlay flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient gold glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, hsl(38 60% 55% / 0.05) 0%, transparent 60%)",
        }}
      />

      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <Logo />
      </div>

      <div className="relative text-center max-w-xl">
        <p className="font-body text-[10px] tracking-[0.4em] uppercase text-accent mb-8">
          Error 404
        </p>

        <h1
          className="font-display font-light leading-[0.9] mb-6"
          style={{ fontSize: "clamp(5rem, 14vw, 10rem)", letterSpacing: "-0.04em" }}
        >
          Page <span className="italic text-accent">Not</span> Found
        </h1>

        {/* Gold divider */}
        <div
          className="mx-auto mb-8"
          style={{
            width: 100,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.5), transparent)",
          }}
        />

        <p className="font-body text-base text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
          The page you're looking for has either moved or never existed.
          Let's guide you back to something beautiful.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="gold-gradient-animated text-accent-foreground font-body font-semibold text-xs tracking-[0.2em] uppercase px-8 py-3.5 rounded-lg hover:opacity-90 inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Return Home
          </Link>
          <Link
            to="/app"
            className="font-body text-xs tracking-[0.2em] uppercase border border-foreground/20 hover:border-accent/50 text-foreground/80 hover:text-accent px-8 py-3.5 rounded-lg transition-all"
          >
            Open Studio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
