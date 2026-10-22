// Single source of truth for pricing across Landing, Pricing page, edge functions.
// Prices in USD. Annual = effective monthly rate (yearly total / 12).

export type PlanId = "free" | "pro" | "studio";
export type BillingPeriod = "monthly" | "annual";

export interface PricingPlan {
  id: PlanId;
  name: string;
  monthly: number; // USD/mo
  annualYearly: number; // USD/yr total when billed annually
  annualEffective: number; // USD/mo effective (annualYearly / 12), rounded for display
  blurb: string;
  quotaLabel: string;
  monthlyQuota: number; // keep in sync with plan_monthly_limit() in the DB
  features: string[];
  highlight: boolean;
  cta: string;
}

// Annual = 10 months' price (about 17% off). Per-image model cost is roughly
// $0.15–0.25 at full resolution, so monthly limits keep each plan profitable.
export const ANNUAL_DISCOUNT_LABEL = "2 months free";

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Starter",
    monthly: 0,
    annualYearly: 0,
    annualEffective: 0,
    blurb: "Try it on your next listing.",
    quotaLabel: "3 stagings a month",
    monthlyQuota: 3,
    features: [
      "3 stagings a month",
      "Every tool: staging, removal, declutter, dusk, sky, lawn, recolor",
      "All 12 design styles",
      "Compare up to 3 styles",
      "Standard resolution with a watermark",
    ],
    highlight: false,
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Professional",
    monthly: 39,
    annualYearly: 390,
    annualEffective: 33,
    blurb: "For agents with a few listings a month.",
    quotaLabel: "100 stagings a month",
    monthlyQuota: 100,
    features: [
      "100 stagings a month",
      "High resolution, no watermark",
      "Up to 4 options per photo",
      "Compare up to 6 styles",
      "MLS export with before/after pairs",
      "Listing pages to share with buyers",
    ],
    highlight: true,
    cta: "Choose Professional",
  },
  {
    id: "studio",
    name: "Studio",
    monthly: 99,
    annualYearly: 990,
    annualEffective: 83,
    blurb: "For photographers and teams shooting every week.",
    quotaLabel: "300 stagings a month",
    monthlyQuota: 300,
    features: [
      "300 stagings a month",
      "Everything in Professional",
      "Priority email support",
    ],
    highlight: false,
    cta: "Choose Studio",
  },
];

export const getPlan = (id: PlanId) =>
  PRICING_PLANS.find((p) => p.id === id) ?? PRICING_PLANS[0];

export const priceLabel = (plan: PricingPlan, period: BillingPeriod) => {
  if (plan.monthly === 0) return "Free";
  const v = period === "annual" ? plan.annualEffective : plan.monthly;
  return `$${v}`;
};

export const yearlyTotal = (plan: PricingPlan) =>
  plan.annualYearly > 0 ? `billed annually ($${plan.annualYearly}/yr)` : "";

export const monthlyQuotaFor = (planId: string): number =>
  getPlan((PRICING_PLANS.some((p) => p.id === planId) ? planId : "free") as PlanId).monthlyQuota;
