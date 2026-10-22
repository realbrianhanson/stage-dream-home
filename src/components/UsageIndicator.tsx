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
  if (plan === "admin") return "Admin";
  if (plan === "pro" || plan === "studio") return getPlan(plan).name;
  return getPlan("free").name;
};

/** Plan name, monthly count and a thin progress bar. */
const UsageIndicator = ({ plan, used, limit, monthResetAt }: UsageIndicatorProps) => {
  const isAdmin = plan === "admin";
  const progress = isAdmin || limit <= 0 ? 0 : Math.min(used / limit, 1);
  const nearLimit = !isAdmin && progress >= 0.8;
  const resetLabel = formatResetDate(monthResetAt);
  const countText = isAdmin ? "Unlimited" : `${used} of ${limit} this month`;
  const title = resetLabel && !isAdmin ? `${countText}. Resets ${resetLabel}.` : countText;

  return (
    <div className="flex flex-col gap-1 min-w-0 text-xs" title={title}>
      <p className="flex items-baseline gap-2 whitespace-nowrap">
        <span className="font-medium text-foreground">{planLabel(plan)}</span>
        <span className={`tabular-nums ${nearLimit ? "text-destructive" : "text-muted-foreground"}`}>
          <span className="sm:hidden" aria-hidden>{isAdmin ? "Unlimited" : `${used}/${limit}`}</span>
          <span className="hidden sm:inline">{countText}</span>
          <span className="sr-only sm:hidden">{countText}</span>
        </span>
      </p>
      {!isAdmin && (
        <div className="h-1 w-full min-w-[56px] rounded-sm bg-muted overflow-hidden" aria-hidden>
          <div
            className={`h-full transition-[width] duration-500 ${nearLimit ? "bg-destructive" : "bg-accent"}`}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default UsageIndicator;
