import { describe, it, expect } from "vitest";
import { planForSubscription, planFromPrice, isEntitled } from "../../supabase/functions/_shared/billing";
import { monthlyQuotaFor } from "@/config/pricing";

const sub = (status: string, extra: object = {}) => ({ status, items: { data: [] }, ...extra });

describe("planForSubscription", () => {
  it("uses plan_id metadata first", () => {
    expect(planForSubscription(sub("active", { metadata: { plan_id: "studio" } }))).toBe("studio");
  });

  it("follows the live price after a portal plan switch", () => {
    expect(
      planForSubscription(sub("active", { metadata: { plan_id: "pro" }, items: { data: [{ price: { unit_amount: 7900 } }] } })),
    ).toBe("studio");
  });

  it("falls back to the legacy price amounts", () => {
    expect(planForSubscription(sub("active", { items: { data: [{ price: { unit_amount: 2900 } }] } }))).toBe("pro");
    expect(planFromPrice({ unit_amount: 78000 })).toBe("studio");
  });

  it("leaves the plan alone when a paying sub has an unknown price", () => {
    expect(planForSubscription(sub("active", { items: { data: [{ price: { unit_amount: 4900 } }] } }))).toBeNull();
  });

  it("drops non-paying subscriptions to free", () => {
    for (const s of ["incomplete", "incomplete_expired", "unpaid", "canceled", "paused"]) {
      expect(planForSubscription(sub(s, { metadata: { plan_id: "pro" } }))).toBe("free");
    }
  });

  it("keeps access through the past_due retry window", () => {
    expect(isEntitled("past_due")).toBe(true);
    expect(isEntitled("trialing")).toBe(true);
  });
});

describe("monthlyQuotaFor", () => {
  it("matches plan_monthly_limit() in the database", () => {
    expect(monthlyQuotaFor("free")).toBe(3);
    expect(monthlyQuotaFor("pro")).toBe(300);
    expect(monthlyQuotaFor("studio")).toBe(500);
    expect(monthlyQuotaFor("bogus")).toBe(3);
  });
});
