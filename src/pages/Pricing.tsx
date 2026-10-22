import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, ChevronDown, Minus } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";
import { useAuth } from "@/hooks/useAuth";
import {
  PRICING_PLANS,
  ANNUAL_DISCOUNT_LABEL,
  priceLabel,
  yearlyTotal,
  type BillingPeriod,
  type PlanId,
} from "@/config/pricing";
import { STYLES } from "@/config/catalogs";
import { TOOLS } from "@/config/tools";
import { startCheckout } from "@/lib/billing";

type Cell = string | boolean;

// Order matches PRICING_PLANS: Starter (free), Professional, Studio.
const quotaCells: Cell[] = PRICING_PLANS.map((p) => p.monthlyQuota.toString());

const COMPARE_ROWS: { label: string; values: Cell[] }[] = [
  { label: "Stagings a month", values: quotaCells },
  { label: `All ${TOOLS.length} photo tools`, values: [true, true, true] },
  { label: "Design styles", values: [String(STYLES.length), String(STYLES.length), String(STYLES.length)] },
  { label: "Options per photo", values: ["1", "Up to 4", "Up to 4"] },
  { label: "Compare styles side by side", values: ["Up to 3", "Up to 6", "Up to 6"] },
  { label: "Resolution", values: ["Standard", "High", "High"] },
  { label: "Watermark-free downloads", values: [false, true, true] },
  { label: "“Virtually staged” label", values: [true, true, true] },
  { label: "MLS export with before/after pairs", values: [true, true, true] },
  { label: "Listing pages to share with buyers", values: [true, true, true] },
  { label: "Priority email support", values: [false, false, true] },
];

const FAQS = [
  {
    q: "How does the free plan work?",
    a: `You get ${PRICING_PLANS[0].monthlyQuota} stagings a month with every tool and style. No credit card needed. Free images carry a small watermark and download at standard resolution.`,
  },
  {
    q: "What counts as a staging?",
    a: "Each image we generate counts as one. Asking for 4 options of the same photo, or comparing 3 styles, uses 4 or 3 stagings.",
  },
  {
    q: "What happens if I hit my monthly limit?",
    a: "New stagings pause until your count resets at the start of your next billing cycle. Everything you've already made stays in your gallery. You can upgrade at any time for a higher limit.",
  },
  {
    q: "How does annual billing work?",
    a: `Annual plans are billed once a year and cost the same as 10 months, so you get ${ANNUAL_DISCOUNT_LABEL}. Your monthly staging limit stays the same.`,
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your billing settings and you keep your plan until the end of the period you paid for.",
  },
  {
    q: "Is my data private?",
    a: "Your gallery is visible only to your account. Share links and listing pages exist only when you create them. We don't use your photos to train AI models. See the Privacy Policy for details.",
  },
];

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

const BillingToggle = ({ value, onChange }: { value: BillingPeriod; onChange: (p: BillingPeriod) => void }) => (
  <div role="group" aria-label="Billing period" className="inline-flex rounded-md border border-border bg-background p-1">
    {(["monthly", "annual"] as const).map((p) => (
      <button
        key={p}
        type="button"
        aria-pressed={value === p}
        onClick={() => onChange(p)}
        className={`rounded px-3 py-1.5 font-body text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          value === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {p === "monthly" ? "Monthly" : `Annual, ${ANNUAL_DISCOUNT_LABEL}`}
      </button>
    ))}
  </div>
);

const CompareCell = ({ value, highlight }: { value: Cell; highlight: boolean }) => {
  if (typeof value === "boolean") {
    return value ? (
      <Check className="w-4 h-4 inline text-accent" aria-label="Included" />
    ) : (
      <Minus className="w-4 h-4 inline text-muted-foreground/50" aria-label="Not included" />
    );
  }
  return <span className={`font-body text-sm tabular-nums ${highlight ? "font-medium text-foreground" : "text-foreground/80"}`}>{value}</span>;
};

const CompareTable = () => (
  <section className="px-4 sm:px-6 py-20 border-t border-border">
    <div className="max-w-6xl mx-auto">
      <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight mb-8">Compare plans</h2>
      <div className="rounded-xl border border-border overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <caption className="sr-only">Features included in each plan</caption>
          <thead>
            <tr className="border-b border-border bg-card">
              <th scope="col" className="text-left font-body text-sm font-medium text-muted-foreground px-5 py-4">Feature</th>
              {PRICING_PLANS.map((p) => (
                <th scope="col" key={p.id} className={`px-5 py-4 text-center font-body text-sm font-semibold ${p.highlight ? "text-accent" : "text-foreground"}`}>
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map((row) => (
              <tr key={row.label} className="border-b border-border last:border-b-0">
                <th scope="row" className="text-left font-body text-sm font-normal text-foreground px-5 py-3.5">{row.label}</th>
                {row.values.map((v, j) => {
                  const highlight = !!PRICING_PLANS[j]?.highlight;
                  return (
                    <td key={PRICING_PLANS[j]?.id ?? j} className={`px-5 py-3.5 text-center ${highlight ? "bg-accent-soft/50" : ""}`}>
                      <CompareCell value={v} highlight={highlight} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </section>
);

const FaqSection = () => (
  <section className="px-4 sm:px-6 py-20 border-t border-border">
    <div className="max-w-6xl mx-auto grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <h2 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">Billing questions</h2>
        <p className="mt-3 font-body text-muted-foreground">
          Something else?{" "}
          <a href="mailto:support@realvision.ai" className="text-accent underline-offset-4 hover:underline">
            Email support
          </a>
        </p>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {FAQS.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-body text-base font-medium text-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="pb-5 pr-8 font-body text-muted-foreground leading-relaxed">
              {f.a}
              {f.q === "Is my data private?" && (
                <>
                  {" "}
                  <Link to="/privacy" className="text-accent underline-offset-4 hover:underline">
                    Read the policy
                  </Link>
                </>
              )}
            </p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billing, setBilling] = useState<BillingPeriod>("monthly");

  const handleCta = (planId: PlanId) => {
    if (planId === "free") {
      navigate(user ? "/app" : "/auth");
      return;
    }
    if (!user) {
      navigate("/auth?next=/pricing");
      return;
    }
    startCheckout(planId, billing);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MarketingNav />

      <main>
        <section className="px-4 sm:px-6 pt-16 pb-12 md:pt-24">
          <div className="max-w-6xl mx-auto flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08]">Pricing</h1>
              <p className="mt-4 font-body text-lg text-muted-foreground">
                Start free. Pay monthly or yearly when you need more stagings and clean, high-resolution downloads.
              </p>
            </div>
            <div className="self-start md:self-auto">
              <BillingToggle value={billing} onChange={setBilling} />
            </div>
          </div>
        </section>

        <section className="px-4 sm:px-6 pb-20" aria-label="Plans">
          <div className="max-w-6xl mx-auto grid gap-4 md:grid-cols-3 items-stretch">
            {PRICING_PLANS.map((plan) => {
              const showYearly = billing === "annual" && plan.monthly > 0;
              return (
                <article
                  key={plan.id}
                  className={`flex flex-col rounded-xl border bg-background p-6 md:p-8 ${
                    plan.highlight ? "border-accent ring-1 ring-accent" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 min-h-[24px]">
                    <h2 className="font-display text-lg font-semibold">{plan.name}</h2>
                    {plan.highlight && (
                      <span className="rounded-md bg-accent-soft px-2 py-0.5 font-body text-xs font-medium text-accent">
                        Most popular
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-body text-sm text-muted-foreground">{plan.blurb}</p>

                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-semibold tracking-tight tabular-nums">{priceLabel(plan, billing)}</span>
                    {plan.monthly > 0 && <span className="font-body text-sm text-muted-foreground">/mo</span>}
                  </p>
                  <p className="mt-1 h-5 font-body text-xs text-muted-foreground tabular-nums">{showYearly ? yearlyTotal(plan) : ""}</p>

                  <button
                    type="button"
                    onClick={() => handleCta(plan.id)}
                    className={`mt-6 w-full rounded-md py-3 font-body text-sm font-medium transition-colors ${focusRing} ${
                      plan.highlight
                        ? "gold-gradient-animated text-accent-foreground"
                        : "border border-border bg-background text-foreground hover:bg-card"
                    }`}
                  >
                    {plan.cta}
                  </button>

                  <ul className="mt-8 space-y-3 border-t border-border pt-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 font-body text-sm text-foreground/85">
                        <Check className="w-4 h-4 mt-0.5 shrink-0 text-accent" aria-hidden />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
          <p className="max-w-6xl mx-auto mt-6 font-body text-sm text-muted-foreground">
            Prices in US dollars. Annual prices are shown per month.
          </p>
        </section>

        <CompareTable />
        <FaqSection />
      </main>

      <MarketingFooter />
    </div>
  );
};

export default Pricing;
