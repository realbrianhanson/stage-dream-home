import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Logo from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <Logo className="mb-12" />
      <h1 className="font-display text-8xl font-bold text-accent mb-4">404</h1>
      <p className="font-body text-xl text-muted-foreground mb-8">Oops! Page not found</p>
      <a
        href="/"
        className="gold-gradient text-accent-foreground font-body font-semibold text-sm px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
      >
        Return to Home
      </a>
    </div>
  );
};

export default NotFound;
