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

    // Try to fetch existing usage row
    let { data, error } = await supabase
      .from("usage")
      .select("plan, stagings_this_month, month_reset_at, onboarding_complete")
      .eq("user_id", user.id)
      .maybeSingle();

    // Auto-create if missing (for users created before trigger)
    if (!data && !error) {
      const { data: inserted } = await supabase
        .from("usage")
        .insert({ user_id: user.id })
        .select("plan, stagings_this_month, month_reset_at, onboarding_complete")
        .single();
      data = inserted;
    }

    if (data) {
      // Check if month needs reset
      const resetAt = new Date(data.month_reset_at).getTime();
      if (Date.now() - resetAt > MONTH_MS) {
        await supabase
          .from("usage")
          .update({ stagings_this_month: 0, month_reset_at: new Date().toISOString() })
          .eq("user_id", user.id);
        data.stagings_this_month = 0;
        data.month_reset_at = new Date().toISOString();
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

  const increment = async () => {
    if (!user || !usage) return;
    const newCount = usage.stagings_this_month + 1;
    await supabase
      .from("usage")
      .update({ stagings_this_month: newCount })
      .eq("user_id", user.id);
    setUsage({ ...usage, stagings_this_month: newCount });
  };

  return {
    usage,
    loading,
    canStage,
    remainingStagings,
    increment,
    freeLimit: FREE_LIMIT,
    refresh: fetchOrCreate,
  };
};
