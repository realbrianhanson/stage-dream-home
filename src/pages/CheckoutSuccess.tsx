import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { useUsage } from "@/hooks/useUsage";

const CheckoutSuccess = () => {
  const { refresh } = useUsage();

  useEffect(() => {
    // Give the webhook a moment to write the new plan, then refresh usage.
    const t = setTimeout(() => {
      refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center">
          <Link to="/" aria-label="RealVision home" className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Logo />
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-20">
        <div className="max-w-md w-full rounded-xl border border-border bg-card p-8 md:p-10">
          <CircleCheck className="w-8 h-8 text-accent" aria-hidden />
          <h1 className="mt-6 font-display text-3xl font-normal tracking-[-0.02em]">Your plan is active</h1>
          <p className="mt-3 font-body text-muted-foreground leading-relaxed">
            Thanks for subscribing. Your new monthly limit will show in the app within a minute. If it doesn't, refresh
            the page.
          </p>
          <Link
            to="/app"
            className="gold-gradient-animated mt-8 inline-flex w-full items-center justify-center rounded-md px-5 py-3 font-body text-sm font-medium text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Open the studio
          </Link>
        </div>
      </main>
    </div>
  );
};

export default CheckoutSuccess;
