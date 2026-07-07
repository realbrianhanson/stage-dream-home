import { Crown } from "lucide-react";
import { getPlan } from "@/config/pricing";

interface UsageIndicatorProps {
  plan: string;
  used: number;
  limit: number;
  monthResetAt?: string | null;
}

const RESET_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

const formatResetDate = (monthResetAt?: string | null) => {
  if (!monthResetAt) return null;
  const nextReset = new Date(new Date(monthResetAt).getTime() + RESET_WINDOW_MS);
  if (Number.isNaN(nextReset.getTime())) return null;
  return nextReset.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const planLabel = (plan: string) => {
  if (plan === "pro") return getPlan("pro").name;
  if (plan === "studio") return getPlan("studio").name;
  return getPlan("free").name;
};

const UsageIndicator = ({ plan, used, limit, monthResetAt }: UsageIndicatorProps) => {
  const isFree = plan === "free";
  const progress = isFree ? Math.min(used / limit, 1) : 1;
  const resetLabel = formatResetDate(monthResetAt);

  return (
    <>
      {/* Compact pill for mobile (<sm) */}
      <div className="sm:hidden inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 font-body text-[11px] text-primary-foreground/80">
        {!isFree && <Crown className="w-3 h-3 text-accent" />}
        <span className="text-accent/85">{planLabel(plan)}</span>
        {isFree && (
          <span className="text-primary-foreground/70">
            · {used}/{limit}
          </span>
        )}
      </div>

      {/* Full indicator for ≥sm */}
      <div className="hidden sm:flex items-center gap-3 font-body text-xs text-muted-foreground">
        <span className="hidden md:inline-flex items-center gap-1.5 text-foreground/70">
          {!isFree && <Crown className="w-3 h-3 text-accent" />}
          <span className={isFree ? "" : "text-accent/85"}>{planLabel(plan)}</span>
        </span>
        {isFree ? (
          <>
            <span>
              {used} of {limit} stagings used
            </span>
            <div className="w-20 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-accent/70 transition-all duration-500"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            {resetLabel && (
              <span className="hidden md:inline text-muted-foreground/70">Resets {resetLabel}</span>
            )}
          </>
        ) : (
          <span className="text-accent/80">
            {plan === "studio" ? "500 stagings / month" : "Unlimited stagings"}
          </span>
        )}
      </div>
    </>
  );
};

export default UsageIndicator;
