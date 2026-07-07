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
  monthlyQuota: number | "unlimited";
  features: string[];
  highlight: boolean;
  cta: string;
}

// Annual discount: monthly * 12 * 0.828... ≈ 17% off
// Pro:    29 * 12 = 348 → 288/yr → 24/mo effective  (~17% off)
// Studio: 79 * 12 = 948 → 780/yr → 65/mo effective  (~17% off)
export const ANNUAL_DISCOUNT_LABEL = "Save 17%";

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Starter",
    monthly: 0,
    annualYearly: 0,
    annualEffective: 0,
    blurb: "Try the magic. Stage your first listings free.",
    quotaLabel: "3 stagings / month",
    monthlyQuota: 3,
    features: [
      "3 stagings per month",
      "Standard quality output",
      "All 6 design styles",
      "Compare up to 3 styles",
      "Watermarked downloads",
    ],
    highlight: false,
    cta: "Start Free",
  },
  {
    id: "pro",
    name: "Professional",
    monthly: 29,
    annualYearly: 288,
    annualEffective: 24,
    blurb: "For agents and photographers staging weekly.",
    quotaLabel: "Unlimited stagings",
    monthlyQuota: "unlimited",
    features: [
      "Unlimited stagings (fair use)",
      "High-resolution output",
      "All 6+ design styles",
      "Compare up to 6 styles",
      "No watermark",
      "Download originals",
      "Personal stagings library",
      "Email support",
    ],
    highlight: true,
    cta: "Get Professional",
  },
  {
    id: "studio",
    name: "Studio",
    monthly: 79,
    annualYearly: 780,
    annualEffective: 65,
    blurb: "For high-volume listing agents and photographers.",
    quotaLabel: "500 stagings / month",
    monthlyQuota: 500,
    features: [
      "Everything in Professional",
      "500 stagings per month",
      "Priority email support",
      "Early access to new design styles",
    ],
    highlight: false,
    cta: "Get Studio",
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
