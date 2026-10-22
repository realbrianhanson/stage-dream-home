import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { Skeleton } from "@/components/ui/skeleton";
import { PRICING_PLANS } from "@/config/pricing";

interface SharedStaging {
  id: string;
  original_image_url: string;
  staged_image_url: string;
  room_type: string;
  style: string;
  property_address: string | null;
  created_at: string;
  /** Not returned by get_shared_staging yet; inferred from style when missing. */
  kind?: string | null;
  mls_disclosure?: boolean;
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const EDIT_STYLE_LABELS = ["removed", "declutter", "day to dusk", "blue sky", "refresh lawn"];
const freeQuota = PRICING_PLANS.find((p) => p.id === "free")?.monthlyQuota;

/** "Virtually staged" for furniture staging (and refines of it), "Virtually edited" for other tools. */
const disclosureLabel = (kind: string | null | undefined, style: string) => {
  if (kind) return kind === "stage" || kind === "refine" ? "Virtually staged" : "Virtually edited";
  const s = style.toLowerCase();
  const isEdit = s.startsWith("recolor") || EDIT_STYLE_LABELS.some((label) => s.startsWith(label));
  return isEdit ? "Virtually edited" : "Virtually staged";
};

const SharedStagingPage = () => {
  const { token } = useParams<{ token: string }>();
  const [staging, setStaging] = useState<SharedStaging | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data, error } = await supabase.rpc("get_shared_staging", { p_token: token });
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) {
        if (error) console.error("Load shared staging failed:", error);
        setNotFound(true);
      } else {
        setStaging(row as SharedStaging);
      }
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-10 sm:px-6">
          <div className="space-y-3">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (notFound || !staging) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="mb-2 text-2xl font-normal tracking-[-0.02em]">This link isn't available</h1>
        <p className="mb-6 max-w-md text-muted-foreground">
          The person who shared it may have turned it off. Ask them for a new link.
        </p>
        <Link
          to="/"
          className={`inline-flex h-10 items-center rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-card ${FOCUS_RING}`}
        >
          Go to RealVision
        </Link>
      </div>
    );
  }

  const label = disclosureLabel(staging.kind, staging.style);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className={`rounded-md ${FOCUS_RING}`} aria-label="RealVision home">
            <Logo />
          </Link>
          <Link
            to="/auth"
            className={`inline-flex h-9 items-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-card ${FOCUS_RING}`}
          >
            Try RealVision
          </Link>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 sm:pt-12">
          <span className="inline-block rounded-sm border border-border bg-card px-1.5 py-0.5 text-xs font-medium">
            {label}
          </span>
          <h1 className="mt-3 text-3xl font-normal tracking-[-0.02em] sm:text-4xl">
            {staging.property_address || <span className="capitalize">{staging.room_type}</span>}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {staging.property_address && <span className="capitalize">{staging.room_type}, </span>}
            {staging.style}
          </p>
        </div>

        <BeforeAfterSlider
          before={staging.original_image_url}
          after={staging.staged_image_url}
          mlsDisclosure={staging.mls_disclosure}
          title="Before and after"
        />

        <p className="mx-auto max-w-5xl px-4 pb-12 text-sm text-muted-foreground sm:px-6">
          The after photo was changed with AI software. Furniture, finishes and views may differ from the property.
        </p>
      </main>

      <section className="border-t border-border bg-card px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-body text-lg font-semibold tracking-tight">Stage your own listings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload an empty room and get a staged photo in about a minute.
              {freeQuota ? ` Try ${freeQuota} stagings a month free.` : ""}
            </p>
          </div>
          <Link
            to="/auth"
            className={`gold-gradient-animated inline-flex h-10 flex-shrink-0 items-center rounded-md px-4 text-sm font-medium ${FOCUS_RING}`}
          >
            Start staging free
          </Link>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-6 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 sm:flex-row">
          <Logo />
          <p className="text-sm text-muted-foreground">© 2026 RealVision. Virtual staging for real estate photos.</p>
        </div>
      </footer>
    </div>
  );
};

export default SharedStagingPage;
