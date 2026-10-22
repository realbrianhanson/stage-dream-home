import { cn } from "@/lib/utils";

/**
 * Content placeholder with a soft shimmer over a muted base.
 * Use for content placeholders that match the final layout dimensions.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/60",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:animate-[skeletonShimmer_2s_ease-in-out_infinite]",
        "before:bg-gradient-to-r before:from-transparent before:via-background/70 before:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
