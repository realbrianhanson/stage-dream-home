import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Mail, Phone, User, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Logo from "@/components/Logo";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressiveImage } from "@/components/ui/progressive-image";
import { PRICING_PLANS } from "@/config/pricing";
import { thumbUrl } from "@/lib/imageUrl";

interface Agent {
  display_name?: string | null;
  brokerage?: string | null;
  phone?: string | null;
  email?: string | null;
  headshot_url?: string | null;
}

interface ListingStaging {
  id: string;
  original_image_url: string;
  staged_image_url: string;
  room_type: string;
  style: string;
  created_at: string;
  mls_disclosure?: boolean;
  /** Not returned by get_listing_page yet; inferred from style when missing. */
  kind?: string | null;
}

interface ListingPageData {
  property_address: string;
  created_at: string;
  agent: Agent | null;
  stagings: ListingStaging[];
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

const hasAgentInfo = (agent: Agent) =>
  !!(agent.display_name || agent.brokerage || agent.phone || agent.email || agent.headshot_url);

const AgentCard = ({ agent }: { agent: Agent }) => (
  <div className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-center gap-4">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
        {agent.headshot_url ? (
          <img
            src={agent.headshot_url}
            alt={agent.display_name || "Listing agent"}
            className="h-full w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <User className="h-6 w-6 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">Listing agent</p>
        {agent.display_name && <p className="truncate text-base font-semibold tracking-tight">{agent.display_name}</p>}
        {agent.brokerage && <p className="truncate text-sm text-muted-foreground">{agent.brokerage}</p>}
      </div>
    </div>
    {(agent.phone || agent.email) && (
      <div className="mt-4 grid gap-2">
        {agent.phone && (
          <a
            href={`tel:${agent.phone.replace(/\s+/g, "")}`}
            className={`gold-gradient-animated inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium tabular-nums ${FOCUS_RING}`}
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call {agent.phone}
          </a>
        )}
        {agent.email && (
          <a
            href={`mailto:${agent.email}`}
            className={`inline-flex h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-card ${FOCUS_RING}`}
          >
            <Mail className="h-4 w-4 flex-shrink-0" aria-hidden />
            <span className="truncate">Email {agent.email}</span>
          </a>
        )}
      </div>
    )}
  </div>
);

const PageHeader = () => (
  <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
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
);

const ListingPage = () => {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ListingPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<ListingStaging | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: rows, error } = await supabase.rpc("get_listing_page", { p_token: token });
      const row = Array.isArray(rows) ? rows[0] : null;
      if (error || !row) {
        if (error) console.error("Load listing page failed:", error);
        setNotFound(true);
      } else {
        setData(row as unknown as ListingPageData);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="border-b border-border">
          <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
          <div className="space-y-3">
            <Skeleton className="h-9 w-2/3" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="mb-2 text-2xl font-normal tracking-[-0.02em]">This listing page isn't available</h1>
        <p className="mb-6 max-w-md text-muted-foreground">
          The agent may have turned off the link. Ask them for a new one.
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

  const agent = data.agent || {};
  const stagings = data.stagings || [];
  const showAgent = hasAgentInfo(agent);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        <div className="mb-8 max-w-3xl">
          <h1 className="text-3xl font-normal tracking-[-0.02em] sm:text-4xl">{data.property_address}</h1>
          <p className="mt-2 text-muted-foreground">
            <span className="tabular-nums">{stagings.length}</span> photo{stagings.length !== 1 ? "s" : ""}. Select a
            photo to compare it with the original.
          </p>
        </div>

        <div className={showAgent ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]" : ""}>
          {showAgent && (
            <aside className="lg:order-2">
              <div className="lg:sticky lg:top-24">
                <AgentCard agent={agent} />
              </div>
            </aside>
          )}

          <section aria-label="Photos" className="lg:order-1">
            {stagings.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-muted-foreground">
                No photos have been added to this listing yet.
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2">
                {stagings.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(s)}
                      className={`group block w-full rounded-xl text-left ${FOCUS_RING}`}
                      aria-label={`${s.room_type}, ${s.style}. Compare with original`}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border">
                        <ProgressiveImage
                          src={thumbUrl(s.staged_image_url)}
                          alt={`${s.room_type}, ${s.style}`}
                          wrapperClassName="absolute inset-0"
                          className="transition-transform duration-500 ease-out group-hover:scale-[1.02] motion-reduce:transition-none"
                        />
                        <span className="absolute left-3 top-3 rounded-sm bg-background/95 px-1.5 py-0.5 text-xs font-medium text-foreground">
                          {disclosureLabel(s.kind, s.style)}
                        </span>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between gap-3">
                        <p className="truncate font-medium capitalize">{s.room_type}</p>
                        <p className="flex-shrink-0 text-sm text-muted-foreground">{s.style}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {stagings.length > 0 && (
              <p className="mt-10 text-sm text-muted-foreground">
                Photos marked virtually staged or virtually edited were changed with AI software. Furniture, finishes
                and views may differ from the property. Open any photo to see the original.
              </p>
            )}
          </section>
        </div>
      </main>

      <section className="border-t border-border bg-card px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-body text-lg font-semibold tracking-tight">Are you an agent? Stage your own listings</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Stage an empty room in about a minute.
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

      <footer className="border-t border-border px-4 py-6 text-center sm:px-6">
        <Link to="/" className={`rounded-sm text-xs text-muted-foreground hover:text-foreground ${FOCUS_RING}`}>
          Made with RealVision
        </Link>
      </footer>

      <DialogPrimitive.Root open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content className="fixed inset-0 z-50 overflow-y-auto bg-background focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0">
            {selected && (
              <>
                <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                  <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <div className="min-w-0">
                      <DialogPrimitive.Title className="truncate font-semibold tracking-tight">
                        {data.property_address}
                      </DialogPrimitive.Title>
                      <DialogPrimitive.Description className="truncate text-sm text-muted-foreground">
                        {selected.style}. {disclosureLabel(selected.kind, selected.style)}.
                      </DialogPrimitive.Description>
                    </div>
                    <DialogPrimitive.Close
                      className={`inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-card ${FOCUS_RING}`}
                    >
                      <X className="h-4 w-4" aria-hidden />
                      Close
                    </DialogPrimitive.Close>
                  </div>
                </div>
                <BeforeAfterSlider
                  before={selected.original_image_url}
                  after={selected.staged_image_url}
                  mlsDisclosure={selected.mls_disclosure}
                  title={selected.room_type}
                />
              </>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
};

export default ListingPage;
