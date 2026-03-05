import { Crown } from "lucide-react";

interface UsageIndicatorProps {
  plan: string;
  used: number;
  limit: number;
}

const UsageIndicator = ({ plan, used, limit }: UsageIndicatorProps) => {
  const isFree = plan === "free";
  const progress = isFree ? Math.min(used / limit, 1) : 1;

  return (
    <div className="flex items-center gap-3 font-body text-xs text-muted-foreground">
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
        </>
      ) : (
        <span className="flex items-center gap-1.5">
          <Crown className="w-3 h-3 text-accent" />
          <span className="text-accent/80">Unlimited stagings</span>
        </span>
      )}
    </div>
  );
};

export default UsageIndicator;
