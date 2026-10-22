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
 * ProgressiveImage fades an image in over a neutral placeholder once it has
 * decoded. Uses native lazy loading and async decode. Give the wrapper a fixed
 * aspect (or absolute inset) so the layout never shifts while loading.
 */
export const ProgressiveImage = ({
  src,
  alt,
  aspect,
  wrapperClassName,
  className,
  eager = false,
  onLoad,
  onError,
  ...rest
}: ProgressiveImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset when the source changes; mark loaded at once if the image is cached.
  useEffect(() => {
    setFailed(false);
    setLoaded(!!(imgRef.current?.complete && imgRef.current.naturalWidth > 0));
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden bg-muted", aspect, wrapperClassName)}>
      {!loaded && !failed && (
        <div
          aria-hidden
          className="absolute inset-0 bg-muted before:absolute before:inset-0 before:-translate-x-full before:animate-[skeletonShimmer_2s_ease-in-out_infinite] before:bg-gradient-to-r before:from-transparent before:via-background/70 before:to-transparent motion-reduce:before:animate-none"
        />
      )}
      {failed && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-muted-foreground">
          Image unavailable
        </div>
      )}
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
        onError={(e) => {
          setFailed(true);
          onError?.(e);
        }}
        className={cn(
          "h-full w-full object-cover transition-opacity duration-500 ease-out motion-reduce:transition-none",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
        {...rest}
      />
    </div>
  );
};
