// Returns a Stripe Customer Portal URL for the current user, so paid users can
// manage or cancel their subscription. Returns { error: "billing_not_configured" }
// when STRIPE_SECRET_KEY is not set.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

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

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: usage } = await admin
      .from("usage")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    let customerId = usage?.stripe_customer_id as string | null | undefined;
    if (!customerId) {
      const existing = await stripe.customers.list({ email: user.email!, limit: 1 });
      customerId = existing.data[0]?.id;
    }
    if (!customerId) {
      return new Response(JSON.stringify({ error: "no_customer" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || req.headers.get("referer") || "";
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin.replace(/\/$/, "")}/app`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("customer-portal error:", err);
    return new Response(JSON.stringify({ error: err?.message ?? "unknown_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
