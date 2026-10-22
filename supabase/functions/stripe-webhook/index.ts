// Stripe webhook — updates public.usage.plan based on subscription lifecycle.
// The client NEVER changes the plan; only this endpoint (via service role) does.
//
// Set STRIPE_WEBHOOK_SECRET in Project Settings → Secrets and configure the
// endpoint URL in Stripe. If the secret is missing, requests are rejected.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";
import { planForSubscription } from "../_shared/billing.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    // 500 so Stripe keeps retrying until the secrets are set; a 200 drops the event.
    console.error("stripe-webhook: STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing");
    return new Response(JSON.stringify({ error: "billing_not_configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeKey);
  const sig = req.headers.get("stripe-signature");
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig ?? "", webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Webhook signature failed:", msg);
    return new Response(`Webhook Error: ${msg}`, { status: 400, headers: corsHeaders });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

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
        const planId = session.metadata?.plan_id === "pro" || session.metadata?.plan_id === "studio"
          ? session.metadata.plan_id
          : null;
        // Async payment methods complete checkout before money arrives; the
        // subscription.updated event grants the plan once it's active.
        if (!userId || !planId || session.payment_status === "unpaid") break;
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
        const plan = planForSubscription(sub);
        if (plan === "free") {
          // Only the subscription on file can take a user back to free; a stray
          // duplicate ending must not strip a paying customer.
          const { error } = await admin
            .from("usage")
            .update({ plan: "free" })
            .eq("stripe_subscription_id", sub.id);
          if (error) throw error;
          break;
        }
        const updates: Record<string, unknown> = {
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
        };
        // null = still paying but plan unknown: keep their current plan.
        if (plan) updates.plan = plan;
        // Claim the row only if it has no subscription yet or already has this one.
        const { data: rows, error } = await admin
          .from("usage")
          .update(updates)
          .eq("stripe_customer_id", customerId)
          .or(`stripe_subscription_id.is.null,stripe_subscription_id.eq.${sub.id}`)
          .select("id");
        if (error) throw error;
        if ((rows?.length ?? 0) === 0 && sub.metadata?.user_id) {
          const { error: e2 } = await admin
            .from("usage")
            .update(updates)
            .eq("user_id", sub.metadata.user_id as string)
            .or(`stripe_subscription_id.is.null,stripe_subscription_id.eq.${sub.id}`);
          if (e2) throw e2;
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        // Only downgrade when the subscription on file is the one that ended,
        // so cancelling a stray duplicate doesn't strip a paying user.
        const { data: rows, error } = await admin
          .from("usage")
          .update({ plan: "free", stripe_subscription_id: null })
          .eq("stripe_subscription_id", sub.id)
          .select("id");
        if (error) throw error;
        if ((rows?.length ?? 0) === 0 && sub.metadata?.user_id) {
          await admin
            .from("usage")
            .update({ plan: "free", stripe_subscription_id: null })
            .eq("user_id", sub.metadata.user_id as string)
            .is("stripe_subscription_id", null);
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
  } catch (err) {
    console.error("Webhook handler failed:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "handler_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
