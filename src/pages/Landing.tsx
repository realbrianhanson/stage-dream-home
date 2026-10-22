import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";
import InteractiveDemo from "@/components/InteractiveDemo";
import { PRICING_PLANS, ANNUAL_DISCOUNT_LABEL, priceLabel, type BillingPeriod } from "@/config/pricing";
import { TOOLS, type ToolId } from "@/config/tools";
import { HERO_EXAMPLES, TOOL_EXAMPLES } from "@/config/showcase";
import { STYLES } from "@/config/catalogs";
import { useAuth } from "@/hooks/useAuth";
import closingRoom from "@/assets/landing-hero.jpg";
import archedBefore from "@/assets/pair-arched-before.jpg";
import archedAlt from "@/assets/pair-arched-alt.jpg";
import bedroomBefore from "@/assets/pair-bedroom-before.jpg";
import bedroomStaged from "@/assets/pair-bedroom-staged.jpg";
import kitchenBefore from "@/assets/pair-kitchen-before.jpg";
import kitchenAfter from "@/assets/pair-kitchen-after.jpg";

const FREE_PLAN = PRICING_PLANS[0];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const FREE_QUOTA = capitalize(FREE_PLAN.quotaLabel);

const TOOL_TITLES: Partial<Record<string, string>> = {
  recolor: "Recolor walls, floors or cabinets",
};

const STEPS = [
  { title: "Upload a listing photo", desc: "A JPG, PNG or WebP of a room or an exterior. Wide, level, well-lit shots give the best results." },
  { title: "Choose a tool and a style", desc: "Furnish it in one of 12 styles, or clear, recolor or brighten what's already there." },
  { title: "Download for the MLS", desc: "Your image is ready in about a minute. Download it, or export originals and edits as pairs." },
];

const HONESTY = [
  { title: "A “Virtually staged” label", desc: "Turn it on and the disclosure is printed on the photo, so it travels with the image wherever it's posted." },
  { title: "Originals and edits, paired", desc: "Export a listing as a zip of before and after pairs, named to sort together, with a disclosure note included." },
  { title: "The house stays the house", desc: "Walls, windows, floors, fixtures and views are kept exactly as they are. Defects are never painted over." },
];

const FAQS = [
  { q: "How long does a staging take?", a: "About a minute per image. You can keep working while it runs, and every result is saved to your library." },
  { q: "Can I use these photos on the MLS?", a: "Most MLS boards allow virtually staged photos as long as you disclose them and keep the original. Turn on the “Virtually staged” label, and use the pairs export to upload originals next to edits. Check your board's rules, since they vary." },
  { q: "What photos work best?", a: "Wide, level shots in good light, taken from a corner or doorway. Empty or lightly furnished rooms give the cleanest staging. Very dark, blurry or fisheye photos give weaker results." },
  { q: "Who owns the images?", a: "You keep ownership of the photos you upload, and you can use the edited images to market your listings. We don't use your photos to train AI models." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your billing settings and you keep your plan until the end of the period you paid for." },
];

const HERO_FACTS = ["12 interior styles", "7 photo tools", "About a minute per photo", "MLS-ready exports"];

// Sections pad outside the container, so 1192px of content lines up with the
// nav, which pads inside its 1240px.
const container = "max-w-[1192px] mx-auto";
const section = "px-4 sm:px-6 py-24 md:py-36 scroll-mt-16";
const h2 = "font-display font-normal text-4xl md:text-5xl lg:text-[3.5rem] leading-[1.04] tracking-[-0.025em]";
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const primaryBtn = `gold-gradient-animated inline-flex items-center justify-center font-body text-sm font-medium px-6 py-3.5 rounded-md ${focusRing}`;
const secondaryBtn = `inline-flex items-center justify-center font-body text-sm font-medium text-foreground px-6 py-3.5 rounded-md border border-border bg-background hover:bg-card transition-colors ${focusRing}`;

/** Scroll to `#id` when the URL hash changes (React Router doesn't). */
const useHashScroll = () => {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const t = window.setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(t);
  }, [hash]);
};

const Hero = ({ startHref }: { startHref: string }) => {
  const [active, setActive] = useState(0);
  const { pair } = HERO_EXAMPLES[active];
  return (
    <section>
      {/* Split hero: copy on the left, the before/after edge to edge on the
          right. Nothing sits on top of the comparison at any width. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,11fr)_minmax(0,13fr)] xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] 2xl:grid-cols-2 lg:min-h-[min(calc(100vh-4rem),880px)]">
        <div className="relative h-[82vw] max-h-[620px] sm:h-[62vw] lg:order-2 lg:h-auto lg:max-h-none lg:min-h-[560px]">
          {/* Remount per pair so each one replays the reveal. */}
          <InteractiveDemo key={pair.id} pair={pair} variant="immersive" intro />
        </div>

        <div className="hero-enter lg:order-1 flex flex-col justify-center px-4 sm:px-6 pt-9 pb-4 lg:py-16 lg:pr-12 xl:pr-16 lg:pl-[max(1.5rem,calc((100vw-1240px)/2+1.5rem))]">
          <h1 className="font-display font-normal text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-[3.5rem] xl:text-[4.25rem] tracking-[-0.03em] text-foreground">
            Show buyers the home it could be.
          </h1>
          <p className="mt-5 font-body text-lg leading-relaxed text-muted-foreground max-w-md">
            Virtual staging and photo edits for listing agents and photographers. Upload a room, choose a style, and have
            an MLS-ready image in about a minute.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row gap-3">
            <Link to={startHref} className={primaryBtn}>
              Stage a room free
            </Link>
            <Link to="/pricing" className={secondaryBtn}>
              See pricing
            </Link>
          </div>
          <div role="group" aria-label="Example result" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5">
            {HERO_EXAMPLES.map((ex, i) => (
              <button
                key={ex.pair.id}
                type="button"
                aria-pressed={i === active}
                onClick={() => setActive(i)}
                className={`font-body text-sm transition-colors rounded-sm ${focusRing} ${
                  i === active
                    ? "text-foreground underline decoration-foreground underline-offset-[7px]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {ex.tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6">
        <ul className={`${container} mt-8 lg:mt-0 grid grid-cols-2 md:grid-cols-4 gap-y-4 border-t border-border`}>
          {HERO_FACTS.map((fact) => (
            <li key={fact} className="pt-5 pb-2 font-body text-sm text-foreground md:border-l md:border-border md:pl-6 md:first:border-l-0 md:first:pl-0">
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

/**
 * The seven tools as a typographic index, the way a brochure lists services.
 * Choosing a tool shows its real before/after beside the list.
 */
const ToolsIndex = ({ startHref }: { startHref: string }) => {
  const [tool, setTool] = useState<ToolId>("stage");
  const example = TOOL_EXAMPLES[tool];
  const previewRef = useRef<HTMLDivElement>(null);

  const choose = (id: ToolId) => {
    setTool(id);
    // On small screens the preview sits above the list; bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };
  return (
    <section id="tools" className={`${section} border-t border-border`}>
      <div className={`${container} grid gap-12 lg:grid-cols-12`}>
        <div className="lg:col-span-6">
          <div className="lg:sticky lg:top-24">
            <h2 className={h2}>Every edit a listing photo needs.</h2>
            <p className="mt-6 font-body text-lg leading-relaxed text-muted-foreground max-w-md">
              Furnish an empty room, clear out a furnished one, or fix the exterior shot before it goes live. Every edit
              keeps the room's walls, windows and floors exactly as they are.
            </p>
            <div ref={previewRef} className="mt-8 scroll-mt-24">
              <InteractiveDemo key={example.id} pair={example} />
              <p className="mt-3 font-body text-sm text-muted-foreground" aria-live="polite">
                A real RealVision result: {example.afterLabel}. Drag to compare.
              </p>
            </div>
            <Link
              to={startHref}
              className={`mt-6 inline-block font-body text-sm font-medium text-foreground underline decoration-border underline-offset-[6px] hover:decoration-foreground transition-colors rounded-sm ${focusRing}`}
            >
              Try it on your photo
            </Link>
          </div>
        </div>

        <ul className="lg:col-span-6 border-b border-border">
          {TOOLS.map((t) => {
            const on = t.id === tool;
            return (
              <li key={t.id} className="border-t border-border">
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => choose(t.id)}
                  className={`group grid w-full grid-cols-[1fr_auto] gap-x-6 gap-y-2 py-7 md:py-8 text-left rounded-sm ${focusRing}`}
                >
                  <span
                    className={`font-display text-[1.75rem] md:text-[2.125rem] leading-tight tracking-[-0.02em] transition-colors ${
                      on ? "text-foreground" : "text-foreground/55 group-hover:text-foreground"
                    }`}
                  >
                    {TOOL_TITLES[t.id] ?? t.label}
                  </span>
                  <span className="row-span-2 self-start pt-2 font-body text-sm text-muted-foreground">
                    {t.exterior ? "Exterior" : "Interior"}
                  </span>
                  <span className="font-body text-base text-muted-foreground">{t.blurb}.</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

/** A finished result with its original photo inset, so every claim shows its source. */
const GalleryShot = ({
  src,
  original,
  width,
  height,
  alt,
  caption,
  aspect,
  className = "",
}: {
  src: string;
  original: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
  aspect: string;
  className?: string;
}) => (
  <figure className={`m-0 ${className}`}>
    <div className="relative">
      <img src={src} alt={alt} width={width} height={height} loading="lazy" decoding="async" className={`w-full ${aspect} object-cover rounded-2xl bg-card`} />
      <div className="absolute left-3 bottom-3 w-[28%] max-w-[180px] overflow-hidden rounded-lg border-2 border-white shadow-[0_8px_24px_-12px_rgba(0,0,0,0.6)]">
        <img src={original} alt="" width={width} height={height} loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
        <span className="absolute left-1.5 top-1.5 rounded bg-white/90 px-1.5 py-0.5 font-body text-[11px] font-medium text-foreground">Original</span>
      </div>
    </div>
    <figcaption className="mt-3 font-body text-sm text-muted-foreground">{caption}</figcaption>
  </figure>
);

const StyleGallery = () => (
  <section className={`${section} pt-0 md:pt-0`}>
    <div className={container}>
      <div className="grid gap-6 lg:grid-cols-12 lg:items-end mb-12 md:mb-16">
        <h2 className={`${h2} lg:col-span-7`}>Twelve styles. One look across the listing.</h2>
        <p className="lg:col-span-5 font-body text-lg leading-relaxed text-muted-foreground">
          Choose a style for each room, then lock a matching palette of woods, fabrics and metals so every photo reads as
          the same home.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <GalleryShot
          className="lg:col-span-8"
          src={archedAlt}
          original={archedBefore}
          width={1920}
          height={1280}
          alt="A living room with an arched window staged in a Modern style with a cream sofa, swivel chairs and a round coffee table"
          caption="Living room, Modern"
          aspect="aspect-[16/10]"
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
          <GalleryShot
            src={bedroomStaged}
            original={bedroomBefore}
            width={1600}
            height={1280}
            alt="A bedroom staged in a Scandinavian style with an upholstered bed, oak nightstands and a woven rug"
            caption="Bedroom, Scandinavian"
            aspect="aspect-[16/11]"
          />
          <GalleryShot
            src={kitchenAfter}
            original={kitchenBefore}
            width={1600}
            height={1280}
            alt="A kitchen styled with bar stools at the island and countertop decor"
            caption="Kitchen, Modern"
            aspect="aspect-[16/11]"
          />
        </div>
      </div>

      <ul aria-label="Design styles" className="mt-14 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border-t border-border">
        {STYLES.map((s) => (
          <li key={s} className="border-b border-border py-4 font-display text-xl tracking-[-0.01em] text-foreground">
            {s}
          </li>
        ))}
      </ul>
    </div>
  </section>
);

const Steps = () => (
  <section className={`${section} bg-card border-y border-border`}>
    <div className={container}>
      <h2 className={`${h2} max-w-2xl`}>From upload to listing in three steps.</h2>
      <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-t border-foreground/80 pt-6">
            <span className="font-display text-6xl leading-none tracking-[-0.03em] text-foreground tabular-nums" aria-hidden>
              {i + 1}
            </span>
            <h3 className="mt-8 font-body text-lg font-semibold text-foreground">{s.title}</h3>
            <p className="mt-2 font-body leading-relaxed text-muted-foreground">{s.desc}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

/** The one dark band on the page: the honesty promise. */
const Honesty = () => (
  <section className={`${section} bg-foreground text-background`}>
    <div className={`${container} grid gap-14 lg:grid-cols-12`}>
      <div className="lg:col-span-5">
        <h2 className={`${h2} text-white`}>Edited photos that stay honest.</h2>
        <p className="mt-6 font-body text-lg leading-relaxed text-white/75 max-w-md">
          Buyers should see the room they'll walk into. RealVision changes what's in it, never the room itself, and
          makes disclosure the easy part.
        </p>
      </div>
      <ul className="lg:col-span-7 border-b border-white/15">
        {HONESTY.map((h) => (
          <li key={h.title} className="border-t border-white/15 py-7">
            <h3 className="font-display text-2xl md:text-[1.75rem] tracking-[-0.015em] text-white">{h.title}</h3>
            <p className="mt-2 font-body leading-relaxed text-white/70 max-w-xl">{h.desc}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

const Pricing = () => {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  return (
    <section id="pricing" className={section}>
      <div className={container}>
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between mb-12">
          <h2 className={`${h2} max-w-2xl`}>Start free. Upgrade when you list more.</h2>
          <div role="group" aria-label="Billing period" className="inline-flex self-start md:self-auto rounded-md border border-border bg-background p-1">
            {(["monthly", "annual"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={`rounded px-3.5 py-1.5 font-body text-sm transition-colors ${focusRing} ${
                  period === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "monthly" ? "Monthly" : `Annual, ${ANNUAL_DISCOUNT_LABEL}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => {
            const dark = plan.highlight;
            return (
              <article
                key={plan.id}
                className={`flex flex-col rounded-2xl p-7 md:p-9 ${dark ? "bg-foreground text-white" : "border border-border bg-background"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-body text-base font-semibold">{plan.name}</h3>
                  {dark && <span className="rounded-md bg-white/10 px-2 py-0.5 font-body text-xs font-medium text-white">Most popular</span>}
                </div>
                <p className="mt-8 flex items-baseline gap-1.5">
                  <span className="font-display text-5xl tracking-[-0.03em] tabular-nums">{priceLabel(plan, period)}</span>
                  {plan.monthly > 0 && <span className={`font-body text-sm ${dark ? "text-white/70" : "text-muted-foreground"}`}>/month</span>}
                </p>
                <p className={`mt-2 font-body text-sm ${dark ? "text-white/70" : "text-muted-foreground"}`}>{plan.blurb}</p>
                <ul className={`mt-8 space-y-2.5 border-t pt-6 font-body text-sm ${dark ? "border-white/15 text-white/85" : "border-border text-foreground"}`}>
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <Link
          to="/pricing"
          className={`mt-10 inline-block font-body text-sm font-medium text-foreground underline decoration-border underline-offset-[6px] hover:decoration-foreground transition-colors rounded-sm ${focusRing}`}
        >
          Compare every plan
        </Link>
      </div>
    </section>
  );
};

const Faq = () => (
  <section className={`${section} border-t border-border`}>
    <div className={`${container} grid gap-12 lg:grid-cols-12`}>
      <div className="lg:col-span-5">
        <h2 className={h2}>Questions agents ask.</h2>
        <p className="mt-6 font-body text-muted-foreground">
          Something else?{" "}
          <a href="mailto:support@realvision.ai" className={`text-foreground underline underline-offset-4 rounded-sm ${focusRing}`}>
            Email us
          </a>
          .
        </p>
      </div>
      <div className="lg:col-span-7 border-b border-border">
        {FAQS.map((f) => (
          <details key={f.q} className="group border-t border-border">
            <summary className={`flex cursor-pointer list-none items-center justify-between gap-6 py-6 font-body text-lg text-foreground rounded-sm ${focusRing} [&::-webkit-details-marker]:hidden`}>
              {f.q}
              <ChevronDown className="w-5 h-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="pb-6 pr-10 font-body leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

/** Full-bleed photo close, with the call to action over it. */
const Closing = ({ startHref }: { startHref: string }) => (
  <section className="relative isolate overflow-hidden">
    <img
      src={closingRoom}
      alt=""
      width={1600}
      height={900}
      loading="lazy"
      decoding="async"
      className="absolute inset-0 -z-10 h-full w-full object-cover"
    />
    <div className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/55 to-black/20" aria-hidden />
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-28 md:py-44">
      <h2 className="font-display font-normal text-5xl md:text-6xl lg:text-7xl leading-[1.02] tracking-[-0.03em] text-white max-w-2xl">
        Stage your next listing tonight.
      </h2>
      <p className="mt-6 font-body text-lg text-white/80 max-w-md">
        {FREE_QUOTA} are free, with every tool and all {STYLES.length} styles. No credit card needed.
      </p>
      <div className="mt-10 flex flex-col sm:flex-row gap-3">
        <Link
          to={startHref}
          className={`inline-flex items-center justify-center rounded-md bg-white px-6 py-3.5 font-body text-sm font-medium text-foreground hover:bg-white/90 transition-colors ${focusRing} focus-visible:ring-offset-black`}
        >
          Stage a room free
        </Link>
        <Link
          to="/pricing"
          className={`inline-flex items-center justify-center rounded-md border border-white/40 px-6 py-3.5 font-body text-sm font-medium text-white hover:bg-white/10 transition-colors ${focusRing} focus-visible:ring-offset-black`}
        >
          See pricing
        </Link>
      </div>
    </div>
  </section>
);

const Landing = () => {
  const { user } = useAuth();
  useHashScroll();
  const startHref = user ? "/app" : "/auth";

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <MarketingNav />
      <main>
        <Hero startHref={startHref} />
        <ToolsIndex startHref={startHref} />
        <StyleGallery />
        <Steps />
        <Honesty />
        <Pricing />
        <Faq />
        <Closing startHref={startHref} />
      </main>
      <MarketingFooter />
    </div>
  );
};

export default Landing;
