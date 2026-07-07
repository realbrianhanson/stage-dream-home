// Creates a Stripe Checkout Session (subscription mode) for the selected plan/period.
// If STRIPE_SECRET_KEY is not set, returns { error: "billing_not_configured" } so the UI
// can show a friendly "Billing is almost ready" toast.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

// Prices are the single source of truth. Keep in sync with src/config/pricing.ts.
const PLAN_PRICING: Record<string, { name: string; monthly: number; annualYearly: number }> = {
  pro: { name: "RealVision Professional", monthly: 2900, annualYearly: 28800 }, // cents
  studio: { name: "RealVision Studio", monthly: 7900, annualYearly: 78000 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(JSON.stringify({ error: "billing_not_configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const planId = String(body?.planId ?? "");
    const period = body?.period === "annual" ? "annual" : "monthly";
    const plan = PLAN_PRICING[planId];
    if (!plan) {
      return new Response(JSON.stringify({ error: "invalid_plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate user via JWT
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = userData.user;

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Reuse existing Stripe customer if one exists for this email
    let customerId: string | undefined;
    const existing = await stripe.customers.list({ email: user.email!, limit: 1 });
    if (existing.data.length > 0) customerId = existing.data[0].id;

    const unitAmount = period === "annual" ? plan.annualYearly : plan.monthly;
    const interval = period === "annual" ? "year" : "month";

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const baseUrl = origin.replace(/\/$/, "");

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      client_reference_id: user.id,
      line_items: [
        {
          price_data: {
            currency: "usd",
            recurring: { interval },
            product_data: { name: `${plan.name} (${period === "annual" ? "Annual" : "Monthly"})` },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: { user_id: user.id, plan_id: planId, period },
      },
      metadata: { user_id: user.id, plan_id: planId, period },
      success_url: `${baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/billing/cancel`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "unknown_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
