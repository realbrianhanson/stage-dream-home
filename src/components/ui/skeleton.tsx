import { cn } from "@/lib/utils";

/**
 * Luxe skeleton: subtle gold-tinted shimmer over a muted base.
 * Use for content placeholders that match the final layout dimensions.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[shimmer_2s_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-accent/15 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
