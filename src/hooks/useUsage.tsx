import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UsageData {
  plan: string;
  stagings_this_month: number;
  month_reset_at: string;
  onboarding_complete: boolean;
}

const FREE_LIMIT = 3;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

export const useUsage = () => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrCreate = useCallback(async () => {
    if (!user) return;

    const { data } = await supabase
      .from("usage")
      .select("plan, stagings_this_month, month_reset_at, onboarding_complete")
      .eq("user_id", user.id)
      .maybeSingle();

    if (data) {
      // Client-side reset check for display purposes only
      const resetAt = new Date(data.month_reset_at).getTime();
      if (Date.now() - resetAt > MONTH_MS) {
        data.stagings_this_month = 0;
      }
      setUsage(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchOrCreate();
  }, [fetchOrCreate]);

  const canStage = usage
    ? usage.plan !== "free" || usage.stagings_this_month < FREE_LIMIT
    : false;

  const remainingStagings = usage
    ? usage.plan !== "free"
      ? Infinity
      : Math.max(0, FREE_LIMIT - usage.stagings_this_month)
    : 0;

  return {
    usage,
    loading,
    canStage,
    remainingStagings,
    freeLimit: FREE_LIMIT,
    refresh: fetchOrCreate,
  };
};
