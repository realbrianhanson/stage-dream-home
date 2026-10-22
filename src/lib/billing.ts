import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PlanId, BillingPeriod } from "@/config/pricing";

const BILLING_NOT_CONFIGURED_MSG =
  "Billing is almost ready — we're finalizing our payment setup. Please check back shortly.";

const isBillingNotConfigured = (payload: unknown, error: unknown) => {
  if ((payload as { error?: string } | null)?.error === "billing_not_configured") return true;
  const status = (error as { context?: { status?: number } } | null)?.context?.status;
  if (status === 501 || status === 503) return true;
  return false;
};

export async function startCheckout(planId: PlanId, period: BillingPeriod) {
  if (planId === "free") return;
  try {
    const { data, error } = await supabase.functions.invoke("create-checkout", {
      body: { planId, period },
    });
    if (isBillingNotConfigured(data, error)) {
      toast.info(BILLING_NOT_CONFIGURED_MSG);
      return;
    }
    if (data?.error === "already_subscribed") {
      toast.info("You already have a subscription. Opening billing so you can change plans…");
      await openCustomerPortal();
      return;
    }
    if (error) throw error;
    if (!data?.url) {
      toast.info(BILLING_NOT_CONFIGURED_MSG);
      return;
    }
    window.location.href = data.url as string;
  } catch (err) {
    // Graceful fallback: if function exists but errored trying to read the key, still show friendly msg
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("billing_not_configured") || msg.includes("not configured")) {
      toast.info(BILLING_NOT_CONFIGURED_MSG);
      return;
    }
    console.error("Checkout error:", err);
    toast.info(BILLING_NOT_CONFIGURED_MSG);
  }
}

export async function openCustomerPortal() {
  try {
    const { data, error } = await supabase.functions.invoke("customer-portal", { body: {} });
    if (isBillingNotConfigured(data, error)) {
      toast.info(BILLING_NOT_CONFIGURED_MSG);
      return;
    }
    if (error) throw error;
    if (!data?.url) {
      toast.info(BILLING_NOT_CONFIGURED_MSG);
      return;
    }
    window.location.href = data.url as string;
  } catch (err) {
    console.error("Portal error:", err);
    toast.info(BILLING_NOT_CONFIGURED_MSG);
  }
}
