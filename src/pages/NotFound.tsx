import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import MarketingNav from "@/components/MarketingNav";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    const previous = document.title;
    document.title = "Page not found | RealVision";
    return () => {
      document.title = previous;
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MarketingNav />
      <main className="flex-1 flex items-center px-4 sm:px-6 py-20">
        <div className="max-w-6xl w-full mx-auto">
          <p className="font-body text-sm font-medium text-accent mb-3 tabular-nums">404</p>
          <h1 className="font-display text-4xl md:text-5xl font-normal tracking-[-0.02em] leading-[1.08]">Page not found</h1>
          <p className="mt-4 max-w-md font-body text-lg text-muted-foreground">
            There's nothing at <span className="font-mono text-base text-foreground break-all">{location.pathname}</span>. The
            link may be old or mistyped.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              to="/"
              className={`gold-gradient-animated inline-flex items-center justify-center rounded-md px-5 py-3 font-body text-sm font-medium text-accent-foreground ${focusRing}`}
            >
              Go to the home page
            </Link>
            <Link
              to="/app"
              className={`inline-flex items-center justify-center rounded-md border border-border bg-background px-5 py-3 font-body text-sm font-medium text-foreground hover:bg-card transition-colors ${focusRing}`}
            >
              Open the studio
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default NotFound;
