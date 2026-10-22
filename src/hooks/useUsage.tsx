import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { monthlyQuotaFor } from "@/config/pricing";

interface UsageData {
  plan: string;
  stagings_this_month: number;
  month_reset_at: string;
  onboarding_complete: boolean;
  is_admin?: boolean;
}

// Admins (the project's first account) get unlimited, unwatermarked stagings.
export const ADMIN_LIMIT = 1_000_000;

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export const useUsage = () => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreate = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("usage")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      // Client-side reset check for display purposes only
      const resetAt = new Date(data.month_reset_at).getTime();
      if (Date.now() - resetAt > MONTH_MS) {
        data.stagings_this_month = 0;
      }
      // Present admins as their own plan so every "free" gate lets them through.
      setUsage({ ...data, plan: data.is_admin ? "admin" : data.plan });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOrCreate();
  }, [fetchOrCreate]);

  const planLimit = usage?.plan === "admin" ? ADMIN_LIMIT : monthlyQuotaFor(usage?.plan ?? "free");
  const remainingStagings = usage ? Math.max(0, planLimit - usage.stagings_this_month) : 0;
  const canStage = remainingStagings > 0;

  return {
    usage,
    loading,
    canStage,
    remainingStagings,
    freeLimit: monthlyQuotaFor("free"),
    planLimit,
    refresh: fetchOrCreate,
  };
};
