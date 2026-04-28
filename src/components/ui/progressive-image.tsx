import { useState, useRef, useEffect, ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface ProgressiveImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  /** Optional aspect ratio wrapper, e.g. "aspect-video", "aspect-square" */
  aspect?: string;
  /** Wrapper className */
  wrapperClassName?: string;
  /** Eager-load (skip lazy) */
  eager?: boolean;
}

/**
 * ProgressiveImage — luxe blur-up loader.
 * Renders a soft gold-tinted shimmer + scale/blur transition as the image decodes.
 * Uses native lazy loading and async decode for performance.
 */
export const ProgressiveImage = ({
  src,
  alt,
  aspect,
  wrapperClassName,
  className,
  eager = false,
  onLoad,
  ...rest
}: ProgressiveImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // If image is already cached, mark loaded immediately to avoid flash
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [src]);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/40",
        aspect,
        wrapperClassName
      )}
    >
      {/* Shimmer placeholder */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 transition-opacity duration-700",
          loaded ? "opacity-0" : "opacity-100"
        )}
        style={{
          background:
            "linear-gradient(110deg, hsl(var(--muted) / 0.6) 30%, hsl(var(--accent) / 0.15) 50%, hsl(var(--muted) / 0.6) 70%)",
          backgroundSize: "200% 100%",
          animation: "skeletonShimmer 2.4s ease-in-out infinite",
        }}
      />
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        className={cn(
          "h-full w-full object-cover transition-all duration-[900ms] ease-out will-change-transform",
          loaded
            ? "opacity-100 scale-100 blur-0"
            : "opacity-0 scale-[1.04] blur-md",
          className
        )}
        {...rest}
      />
    </div>
  );
};
