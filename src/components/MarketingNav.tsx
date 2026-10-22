import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const linkClass = `font-body text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1.5 ${focusRing}`;
const mobileLinkClass = `font-body text-base text-foreground py-3 border-b border-border rounded-md ${focusRing}`;

const NAV_LINKS = [
  { to: "/#tools", label: "Tools" },
  { to: "/pricing", label: "Pricing" },
];

const MarketingNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  // Close the mobile menu whenever the route or hash changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  const appHref = user ? "/app" : "/auth";
  const appLabel = user ? "Open app" : "Start free";

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <nav aria-label="Main" className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link to="/" className={`shrink-0 rounded-md ${focusRing}`} aria-label="RealVision home">
          <Logo />
        </Link>

        <div className="hidden md:flex items-center gap-3">
          {NAV_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={linkClass}>
              {l.label}
            </Link>
          ))}
          {!user && (
            <Link to="/auth" className={linkClass}>
              Sign in
            </Link>
          )}
          <Link
            to={appHref}
            className={`ml-1 gold-gradient-animated font-body text-sm font-medium text-accent-foreground px-4 py-2 rounded-md ${focusRing} focus-visible:ring-offset-2`}
          >
            {appLabel}
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="marketing-mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className={`md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md border border-border text-foreground hover:bg-card ${focusRing}`}
        >
          {open ? <X className="w-5 h-5" aria-hidden /> : <Menu className="w-5 h-5" aria-hidden />}
        </button>
      </nav>

      {open && (
        <div id="marketing-mobile-menu" className="md:hidden border-t border-border bg-background">
          <div className="max-w-[1240px] mx-auto px-4 pt-1 pb-4 flex flex-col">
            {NAV_LINKS.map((l) => (
              <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className={mobileLinkClass}>
                {l.label}
              </Link>
            ))}
            {!user && (
              <Link to="/auth" onClick={() => setOpen(false)} className={mobileLinkClass}>
                Sign in
              </Link>
            )}
            <Link
              to={appHref}
              onClick={() => setOpen(false)}
              className={`gold-gradient-animated mt-4 text-center font-body text-base font-medium text-accent-foreground px-4 py-3 rounded-md ${focusRing} focus-visible:ring-offset-2`}
            >
              {appLabel}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export default MarketingNav;
