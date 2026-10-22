// Pure Stripe → plan helpers for stripe-webhook. No Deno or network imports so
// vitest can cover them from src/test.

export type PaidPlan = "pro" | "studio";

interface PriceLike {
  nickname?: string | null;
  unit_amount?: number | null;
}

interface SubscriptionLike {
  status: string;
  metadata?: Record<string, string | undefined> | null;
  items?: { data?: Array<{ price?: PriceLike | null }> } | null;
}

// Statuses that keep a paid plan. past_due is Stripe's retry grace period; it
// ends in unpaid or canceled, which drop the user to free.
const ENTITLED_STATUSES = new Set(["active", "trialing", "past_due"]);

export const isEntitled = (status: string) => ENTITLED_STATUSES.has(status);

const asPaidPlan = (v: unknown): PaidPlan | null => (v === "pro" || v === "studio" ? v : null);

/** Plan from the subscription price (checkout uses inline prices, not price IDs). */
export function planFromPrice(price: PriceLike | null | undefined): PaidPlan | null {
  const amount = price?.unit_amount ?? null;
  // Current prices, then the original 2026 launch prices for older subscribers.
  if (amount === 3900 || amount === 39000 || amount === 2900 || amount === 28800) return "pro";
  if (amount === 9900 || amount === 99000 || amount === 7900 || amount === 78000) return "studio";
  const n = (price?.nickname ?? "").toLowerCase();
  if (n.includes("studio")) return "studio";
  if (n.includes("professional") || n.includes("pro")) return "pro";
  return null;
}

/**
 * Decide what a subscription event should do to the user's plan.
 * - "free" when the subscription no longer entitles them
 * - the paid plan when it does and we can tell which one
 * - null when it entitles them but the plan is unknown: leave the plan alone
 *   rather than downgrade a paying customer
 */
export function planForSubscription(sub: SubscriptionLike): PaidPlan | "free" | null {
  if (!isEntitled(sub.status)) return "free";
  // Live price first: portal plan switches change the price, not our metadata.
  return planFromPrice(sub.items?.data?.[0]?.price) ?? asPaidPlan(sub.metadata?.plan_id);
}
