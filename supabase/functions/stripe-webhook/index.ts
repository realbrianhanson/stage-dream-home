// Stripe webhook — updates public.usage.plan based on subscription lifecycle.
// The client NEVER changes the plan; only this endpoint (via service role) does.
//
// Set STRIPE_WEBHOOK_SECRET in Project Settings → Secrets and configure the
// endpoint URL in Stripe. If the secret is missing, requests are rejected.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const priceToPlan = (nickname: string | null, amount: number | null): "pro" | "studio" | null => {
  // We identify by unit_amount because create-checkout uses inline price_data (no fixed price id).
  // Monthly 2900 / annual 28800 => pro. Monthly 7900 / annual 78000 => studio.
  if (amount === 2900 || amount === 28800) return "pro";
  if (amount === 7900 || amount === 78000) return "studio";
  const n = (nickname ?? "").toLowerCase();
  if (n.includes("studio")) return "studio";
  if (n.includes("professional") || n.includes("pro")) return "pro";
  return null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "billing_not_configured" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig ?? "", webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature failed:", err?.message);
    return new Response(`Webhook Error: ${err?.message}`, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const setPlanByCustomer = async (customerId: string, updates: Record<string, unknown>) => {
    // Match by stripe_customer_id first; fall back to email lookup below if not found.
    const { data: rows, error } = await admin
      .from("usage")
      .update(updates)
      .eq("stripe_customer_id", customerId)
      .select("id");
    if (error) throw error;
    return rows?.length ?? 0;
  };

  const setPlanByUserId = async (userId: string, updates: Record<string, unknown>) => {
    const { error } = await admin.from("usage").update(updates).eq("user_id", userId);
    if (error) throw error;
  };

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || (session.metadata?.user_id as string | undefined);
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id;
        const planId = (session.metadata?.plan_id as "pro" | "studio" | undefined) ?? null;
        if (!userId || !planId) break;
        await setPlanByUserId(userId, {
          plan: planId,
          stripe_customer_id: customerId ?? null,
          stripe_subscription_id: subscriptionId ?? null,
        });
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const item = sub.items.data[0];
        const price = item?.price;
        const plan = priceToPlan(price?.nickname ?? null, price?.unit_amount ?? null);
        const cancelled = sub.status === "canceled" || sub.status === "unpaid" || sub.status === "incomplete_expired";
        const updates: Record<string, unknown> = {
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          plan: cancelled ? "free" : plan ?? "free",
        };
        const matched = await setPlanByCustomer(customerId, updates);
        if (matched === 0 && sub.metadata?.user_id) {
          await setPlanByUserId(sub.metadata.user_id as string, updates);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const matched = await setPlanByCustomer(customerId, {
          plan: "free",
          stripe_subscription_id: null,
        });
        if (matched === 0 && sub.metadata?.user_id) {
          await setPlanByUserId(sub.metadata.user_id as string, {
            plan: "free",
            stripe_subscription_id: null,
          });
        }
        break;
      }

      default:
        // ignore
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook handler failed:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "handler_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
