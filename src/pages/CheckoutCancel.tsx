import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const CheckoutCancel = () => (
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
        <h1 className="font-display text-3xl font-semibold tracking-tight">Checkout cancelled</h1>
        <p className="mt-3 font-body text-muted-foreground leading-relaxed">
          You weren't charged. Your account stays on its current plan, and you can upgrade whenever you're ready.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <Link
            to="/pricing"
            className={`gold-gradient-animated inline-flex flex-1 items-center justify-center rounded-md px-5 py-3 font-body text-sm font-medium text-accent-foreground ${focusRing}`}
          >
            Back to pricing
          </Link>
          <Link
            to="/app"
            className={`inline-flex flex-1 items-center justify-center rounded-md border border-border bg-background px-5 py-3 font-body text-sm font-medium text-foreground hover:bg-card transition-colors ${focusRing}`}
          >
            Go to the studio
          </Link>
        </div>
      </div>
    </main>
  </div>
);

export default CheckoutCancel;
