import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Brush,
  Check,
  ChevronDown,
  CloudSun,
  Download,
  Eraser,
  Files,
  PaintRoller,
  Ruler,
  SlidersHorizontal,
  Sofa,
  Sprout,
  Sunset,
  Tag,
  Upload,
  type LucideIcon,
} from "lucide-react";
import SectionEyebrow from "@/components/SectionEyebrow";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";
import InteractiveDemo from "@/components/InteractiveDemo";
import { PRICING_PLANS, ANNUAL_DISCOUNT_LABEL, priceLabel, type BillingPeriod } from "@/config/pricing";
import { TOOLS, type ToolId } from "@/config/tools";
import { STYLES } from "@/config/catalogs";
import { useAuth } from "@/hooks/useAuth";
import beforeLiving from "@/assets/before-vacant.jpg";
import afterLiving from "@/assets/after-staged.jpg";
import showcaseBedroom from "@/assets/showcase-bedroom.jpg";
import showcaseKitchen from "@/assets/showcase-kitchen.jpg";
import showcaseLiving from "@/assets/showcase-living.jpg";

const FREE_PLAN = PRICING_PLANS[0];
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const FREE_QUOTA = capitalize(FREE_PLAN.quotaLabel);

const TOOL_ICONS: Record<ToolId, LucideIcon> = {
  stage: Sofa,
  remove: Eraser,
  declutter: Brush,
  recolor: PaintRoller,
  dusk: Sunset,
  sky: CloudSun,
  lawn: Sprout,
};

const SHOWCASE = [
  { img: showcaseLiving, label: "Living room, Modern style", alt: "Living room staged with a curved sofa, round coffee table and large abstract painting" },
  { img: showcaseBedroom, label: "Bedroom, Luxury style", alt: "Bedroom staged with an upholstered bed, satin bedding and bedside lamps" },
  { img: showcaseKitchen, label: "Kitchen, Modern style", alt: "Kitchen with walnut cabinets, marble island and pendant lights" },
];

const STEPS = [
  { icon: Upload, title: "Upload a listing photo", desc: "A JPG, PNG or WebP of a room or exterior. Wide, level, well-lit shots work best." },
  { icon: SlidersHorizontal, title: "Pick a tool and a style", desc: "Add furniture in one of 12 styles, or clear, recolor or brighten what's already there." },
  { icon: Download, title: "Download for the MLS", desc: "Your result is ready in about a minute. Download it, or export originals and edits as pairs." },
];

const HONESTY = [
  { icon: Tag, title: "“Virtually staged” label", desc: "Turn on the label and it's printed on the photo, so the disclosure travels with the image." },
  { icon: Files, title: "Original and edited pairs", desc: "Export a listing as a zip of before/after pairs, named to sort together, with a disclosure note included." },
  { icon: Ruler, title: "The house stays the house", desc: "Walls, windows, floors, fixtures and built-ins are kept as they are. Defects aren't painted over." },
];

const FAQS = [
  { q: "How long does a staging take?", a: "About a minute per image. You can keep working while it runs, and every result is saved to your gallery." },
  { q: "Can I use these photos on the MLS?", a: "Most MLS boards allow virtually staged photos as long as you disclose them and keep the original. Turn on the “Virtually staged” label, and use the pairs export to upload originals next to edits. Check your board's rules, since they vary." },
  { q: "What photos work best?", a: "Wide, level shots in good light, taken from a corner or doorway. Empty or lightly furnished rooms give the cleanest staging. Very dark, blurry or fisheye photos give weaker results." },
  { q: "Who owns the images?", a: "You keep ownership of the photos you upload, and you can use the edited images to market your listings. We don't use your photos to train AI models." },
  { q: "Can I cancel anytime?", a: "Yes. Cancel from your billing settings and you keep your plan until the end of the period you paid for." },
];

const sectionClass = "px-4 sm:px-6 py-20 md:py-28 scroll-mt-16";
const headingClass = "font-display text-3xl md:text-4xl font-semibold tracking-tight text-foreground";
const primaryBtn =
  "gold-gradient-animated inline-flex items-center justify-center font-body text-sm font-medium text-accent-foreground px-5 py-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";
const secondaryBtn =
  "inline-flex items-center justify-center font-body text-sm font-medium text-foreground px-5 py-3 rounded-md border border-border bg-background hover:bg-card transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

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
  return (
    <section className="px-4 sm:px-6 pt-12 pb-20 md:pt-20 md:pb-28">
      <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
        <div className="hero-enter">
          <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight text-foreground leading-[1.08] text-balance">
            Stage an empty listing photo in about a minute
          </h1>
          <p className="mt-5 font-body text-lg text-muted-foreground leading-relaxed max-w-md">
            Upload a room, pick a style, and download a staged photo that's ready for the MLS, with the original kept
            alongside it.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to={startHref} className={primaryBtn}>
              Stage a room free
            </Link>
            <Link to="/pricing" className={secondaryBtn}>
              See pricing
            </Link>
          </div>
          <p className="mt-4 font-body text-sm text-muted-foreground">
            {FREE_QUOTA} free. No credit card needed.
          </p>
        </div>
        <InteractiveDemo />
      </div>
    </section>
  );
};

const StagingCard = () => (
  <article className="rounded-xl border border-border bg-card overflow-hidden lg:col-span-3">
    <div className="grid lg:grid-cols-2">
      <div className="grid grid-cols-2 gap-px bg-border lg:min-h-[340px]">
        <figure className="relative m-0 bg-background">
          <img src={beforeLiving} alt="Empty living room before staging" width={960} height={640} loading="lazy" className="h-full w-full object-cover aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto" />
          <figcaption className="absolute left-3 top-3 rounded-md bg-background/90 px-2 py-1 font-body text-xs font-medium text-foreground">Before</figcaption>
        </figure>
        <figure className="relative m-0 bg-background">
          <img src={afterLiving} alt="The same living room after Add furniture" width={1248} height={832} loading="lazy" className="h-full w-full object-cover aspect-[3/4] sm:aspect-[4/3] lg:aspect-auto" />
          <figcaption className="absolute left-3 top-3 rounded-md bg-accent px-2 py-1 font-body text-xs font-medium text-accent-foreground">After</figcaption>
        </figure>
      </div>
      <div className="p-6 md:p-10 flex flex-col justify-center">
        <Sofa className="w-6 h-6 text-accent" aria-hidden />
        <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight">Add furniture</h3>
        <p className="mt-2 font-body text-muted-foreground leading-relaxed">
          Furnish an empty room to scale, in the style that suits the buyer. Generate a few options and keep the one you
          like, or compare styles side by side.
        </p>
        <p className="mt-6 font-body text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{STYLES.length} styles: </span>
          {STYLES.join(", ")}
        </p>
      </div>
    </div>
  </article>
);

const ToolsSection = () => {
  const otherTools = TOOLS.filter((t) => t.id !== "stage");
  return (
    <section id="tools" className={`${sectionClass} border-t border-border`}>
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-12">
          <SectionEyebrow label="What you can do" />
          <h2 className={headingClass}>Seven edits for listing photos</h2>
          <p className="mt-4 font-body text-lg text-muted-foreground">
            Stage empty rooms, clear out the ones that aren't, and fix the exterior shot before it goes live.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StagingCard />
          {otherTools.map((tool) => {
            const Icon = TOOL_ICONS[tool.id];
            return (
              <article key={tool.id} className="rounded-xl border border-border bg-background p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <Icon className="w-6 h-6 text-accent" aria-hidden />
                  <span className="rounded-md border border-border px-2 py-0.5 font-body text-xs text-muted-foreground">
                    {tool.exterior ? "Exterior" : "Interior"}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold tracking-tight">
                  {tool.id === "recolor" ? "Recolor walls, floors, cabinets" : tool.label}
                </h3>
                <p className="mt-2 font-body text-muted-foreground">{tool.blurb}.</p>
              </article>
            );
          })}
        </div>

        <div className="mt-16">
          <h3 className="font-display text-lg font-semibold tracking-tight mb-4">More staged rooms</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            {SHOWCASE.map((item) => (
              <figure key={item.label} className="m-0">
                <img
                  src={item.img}
                  alt={item.alt}
                  width={640}
                  height={512}
                  loading="lazy"
                  className="w-full aspect-[5/4] object-cover rounded-xl border border-border"
                />
                <figcaption className="mt-2 font-body text-sm text-muted-foreground">{item.label}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const StepsSection = () => (
  <section className={`${sectionClass} bg-card border-y border-border`}>
    <div className="max-w-6xl mx-auto">
      <div className="max-w-2xl mb-12">
        <SectionEyebrow label="How it works" />
        <h2 className={headingClass}>From upload to listing in three steps</h2>
      </div>
      <ol className="grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-xl border border-border bg-background p-6 md:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft font-body text-sm font-semibold text-accent tabular-nums">
                {i + 1}
              </span>
              <s.icon className="w-5 h-5 text-muted-foreground" aria-hidden />
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold tracking-tight">{s.title}</h3>
            <p className="mt-2 font-body text-muted-foreground leading-relaxed">{s.desc}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

const HonestySection = () => (
  <section className={sectionClass}>
    <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <SectionEyebrow label="Built for MLS rules" />
        <h2 className={headingClass}>Edited photos that are honest about it</h2>
        <p className="mt-4 font-body text-lg text-muted-foreground leading-relaxed">
          Buyers should see the room they'll walk into. RealVision changes what's in it, not the room itself, and makes
          disclosure the easy part.
        </p>
      </div>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {HONESTY.map((h) => (
          <li key={h.title} className="flex gap-4 p-6">
            <h.icon className="w-5 h-5 mt-0.5 shrink-0 text-accent" aria-hidden />
            <div>
              <h3 className="font-display text-base font-semibold">{h.title}</h3>
              <p className="mt-1 font-body text-muted-foreground leading-relaxed">{h.desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

const PricingSummary = () => {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  return (
    <section id="pricing" className={`${sectionClass} bg-card border-y border-border`}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-10">
          <div className="max-w-2xl">
            <SectionEyebrow label="Pricing" />
            <h2 className={headingClass}>Start free, upgrade when you list more</h2>
          </div>
          <div role="group" aria-label="Billing period" className="inline-flex self-start rounded-md border border-border bg-background p-1">
            {(["monthly", "annual"] as const).map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={period === p}
                onClick={() => setPeriod(p)}
                className={`rounded px-3 py-1.5 font-body text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  period === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p === "monthly" ? "Monthly" : `Annual, ${ANNUAL_DISCOUNT_LABEL}`}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`rounded-xl border bg-background p-6 md:p-8 ${plan.highlight ? "border-accent ring-1 ring-accent" : "border-border"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                {plan.highlight && (
                  <span className="rounded-md bg-accent-soft px-2 py-0.5 font-body text-xs font-medium text-accent">Most popular</span>
                )}
              </div>
              <p className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight tabular-nums">{priceLabel(plan, period)}</span>
                {plan.monthly > 0 && <span className="font-body text-sm text-muted-foreground">/mo</span>}
              </p>
              <p className="mt-1 font-body text-sm font-medium text-foreground tabular-nums">{plan.quotaLabel}</p>
              <p className="mt-3 font-body text-sm text-muted-foreground">{plan.blurb}</p>
            </article>
          ))}
        </div>

        <Link to="/pricing" className={`${secondaryBtn} mt-8`}>
          Compare plans
        </Link>
      </div>
    </section>
  );
};

const FaqSection = () => (
  <section className={sectionClass}>
    <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <div>
        <SectionEyebrow label="FAQ" />
        <h2 className={headingClass}>Questions agents ask</h2>
        <p className="mt-4 font-body text-muted-foreground">
          Something else?{" "}
          <a href="mailto:support@realvision.ai" className="text-accent underline-offset-4 hover:underline">
            Email support
          </a>
        </p>
      </div>
      <div className="divide-y divide-border border-y border-border">
        {FAQS.map((f) => (
          <details key={f.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-body text-base font-medium text-foreground rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <p className="pb-5 pr-8 font-body text-muted-foreground leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const ClosingCta = ({ startHref }: { startHref: string }) => (
  <section className="px-4 sm:px-6 pb-20 md:pb-28">
    <div className="max-w-6xl mx-auto rounded-xl border border-border bg-card p-8 md:p-12 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
      <div className="max-w-xl">
        <h2 className={headingClass}>Try it on your next listing</h2>
        <ul className="mt-4 flex flex-col gap-2 font-body text-muted-foreground">
          {[`${FREE_QUOTA} on the free plan`, `Every tool and all ${STYLES.length} styles`, "No credit card to start"].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="w-4 h-4 text-accent" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to={startHref} className={primaryBtn}>
          Stage a room free
        </Link>
        <Link to="/pricing" className={secondaryBtn}>
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
        <ToolsSection />
        <StepsSection />
        <HonestySection />
        <PricingSummary />
        <FaqSection />
        <ClosingCta startHref={startHref} />
      </main>
      <MarketingFooter />
    </div>
  );
};

export default Landing;
