import { useState } from "react";
import { motion, useTransform, useMotionValue } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Palette, TrendingUp, Sparkles, Check, Upload, Wand2, Download } from "lucide-react";
import SectionEyebrow from "@/components/SectionEyebrow";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";
import BeforeAfterSlider from "@/components/BeforeAfterSlider";
import { PRICING_PLANS, ANNUAL_DISCOUNT_LABEL, priceLabel } from "@/config/pricing";
import { startCheckout } from "@/lib/billing";
import { useAuth } from "@/hooks/useAuth";
import heroImage from "@/assets/landing-hero.jpg";
import beforeVacant from "@/assets/before-vacant.jpg";
import afterStaged from "@/assets/after-staged.jpg";
import showcaseBedroom from "@/assets/showcase-bedroom.jpg";
import showcaseKitchen from "@/assets/showcase-kitchen.jpg";
import showcaseLiving from "@/assets/showcase-living.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.15, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  }),
};

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const glowX = useMotionValue(50);
  const glowY = useMotionValue(50);
  const glowBackground = useTransform(
    [glowX, glowY],
    ([x, y]) => `radial-gradient(400px circle at ${x}% ${y}%, hsl(38 60% 55% / 0.18), transparent 60%)`
  );

  const handleCardMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    glowX.set(((e.clientX - rect.left) / rect.width) * 100);
    glowY.set(((e.clientY - rect.top) / rect.height) * 100);
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden grain-overlay">
      <MarketingNav />


      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Luxury staged living room" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-foreground/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-foreground/30" />
        </div>

        {/* Radial gold glow accents */}
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 30%, hsl(38 60% 55% / 0.06) 0%, transparent 50%)' }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 70% 70%, hsl(38 60% 55% / 0.04) 0%, transparent 50%)' }} />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
            className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 rounded-full px-5 py-2 mb-8"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent" style={{ boxShadow: '0 0 8px hsl(38 60% 55% / 0.5)' }} />
            <span className="font-body text-xs tracking-[0.2em] uppercase text-accent">AI-Powered Virtual Staging</span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="visible"
            className="font-display font-light text-primary-foreground leading-[0.95] mb-8"
            style={{ fontSize: 'clamp(3rem, 8vw, 6.5rem)', letterSpacing: '-0.03em' }}
          >
            {["Every", "Room,"].map((word, idx) => (
              <motion.span
                key={word}
                variants={fadeUp}
                custom={idx + 1}
                className="inline-block mr-[0.25em]"
              >
                {word}
              </motion.span>
            ))}
            <motion.span
              variants={fadeUp}
              custom={3}
              className="inline-block italic font-medium text-accent"
            >
              Reimagined.
            </motion.span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="font-body text-lg md:text-xl text-primary-foreground/75 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            AI-staged interiors so convincing, buyers fall in love before they walk through the door.
            Photorealistic results in under thirty seconds — for a fraction of the cost of physical staging.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={3}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate("/auth")}
              className="gold-gradient-animated text-accent-foreground font-body font-semibold text-base px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity flex items-center gap-2 group"
            >
              Stage 3 Rooms Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#showcase"
              className="font-body text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors border border-primary-foreground/30 px-8 py-4 rounded-lg hover:border-accent/60 hover:bg-primary-foreground/5"
            >
              See the Work
            </a>
          </motion.div>

          {/* Microcopy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            className="mt-5 flex items-center justify-center gap-2 text-primary-foreground/60"
          >
            <Check className="w-3.5 h-3.5 text-accent" />
            <span className="font-body text-xs tracking-wide">No credit card · 3 free stagings · Results in 30s</span>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={5}
            className="mt-16 border-t border-b border-primary-foreground/15 py-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-primary-foreground/75"
          >
            {["Under 30s", "6 Design Styles", "Free to Try"].map((stat) => (
              <span key={stat} className="font-body text-sm tracking-wide">{stat}</span>
            ))}
          </motion.div>

          {/* Gold divider */}
          <div
            className="mt-8 mx-auto"
            style={{ width: 120, height: 1, background: 'linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.4), transparent)' }}
          />
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="w-6 h-10 rounded-full border-2 border-primary-foreground/30 flex items-start justify-center p-1.5"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
          </motion.div>
        </motion.div>
      </section>
      {/* Positioning line */}
      <section className="py-16 px-6 bg-background border-b border-border/40">
        <div className="max-w-4xl mx-auto text-center">
          <p className="font-display text-xl md:text-2xl font-light italic text-foreground/70 tracking-wide">
            Built for listing agents, photographers, and home stagers.
          </p>
        </div>
      </section>

      {/* Before/After Section */}
      <section className="py-32 px-6 bg-background relative">
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/5 to-transparent h-40" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center top, hsl(38 60% 55% / 0.04) 0%, transparent 60%)' }} />
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <SectionEyebrow number="01" label="The Magic" />
            <h2 className="font-display text-4xl md:text-6xl font-medium mb-6">
              Empty to <span className="italic text-accent">Extraordinary</span>
            </h2>
            <p className="font-body text-muted-foreground max-w-xl mx-auto text-lg">
              One photo. Thirty seconds. A completely transformed space that makes buyers fall in love.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={1}
          >
            <BeforeAfterSlider before={beforeVacant} after={afterStaged} />
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.15), transparent)' }} />

      {/* How It Works */}
      <section className="py-32 px-6 bg-background relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, hsl(38 60% 55% / 0.04) 0%, transparent 70%)' }} />
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-20"
          >
            <SectionEyebrow number="02" label="How It Works" />
            <h2 className="font-display text-4xl md:text-6xl font-medium">
              Three steps, <span className="italic text-accent">one gorgeous listing</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Upload, step: "01", title: "Upload your photo", desc: "Drop in a clear photo of any vacant or lightly furnished room. JPG or PNG, any resolution." },
              { icon: Wand2, step: "02", title: "Choose your style", desc: "Pick from Modern, Scandinavian, Luxury and more — or compare several side by side." },
              { icon: Download, step: "03", title: "Download and list", desc: "In under thirty seconds, download high-resolution staged photos ready for your listing." },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="group p-8 rounded-2xl border border-white/[0.06] hover:border-accent/25 transition-all duration-500 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] hover:shadow-dramatic hover:-translate-y-1 relative"
              >
                <span className="absolute top-6 right-8 font-display text-5xl font-light text-accent/15 select-none">{s.step}</span>
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <s.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-display text-xl font-medium mb-3">{s.title}</h3>
                <p className="font-body text-muted-foreground text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* Divider */}
      <div className="max-w-3xl mx-auto" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.15), transparent)' }} />

      {/* Features */}
      <section id="features" className="py-32 px-6 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, hsl(38 60% 55% / 0.04) 0%, transparent 70%)' }} />
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-20"
          >
            <SectionEyebrow number="03" label="Why RealVision" />
            <h2 className="font-display text-4xl md:text-6xl font-medium">
              The Future of <span className="italic text-accent">Staging</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Sparkles, title: "AI Intelligence", desc: "Our model understands room geometry, lighting, and design to create photorealistic results." },
              { icon: Clock, title: "30-Second Turnaround", desc: "No more waiting days for traditional staging. Get results in under a minute." },
              { icon: Palette, title: "6+ Design Styles", desc: "Modern, traditional, minimalist, Scandinavian, mid-century, and luxury aesthetics." },
              { icon: TrendingUp, title: "Listings That Move", desc: "Staged homes consistently sell faster and for more than vacant ones." },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="group p-8 rounded-2xl border border-white/[0.06] hover:border-accent/25 transition-all duration-500 bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.04] hover:shadow-dramatic hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/15 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <feature.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-display text-xl font-medium mb-3">{feature.title}</h3>
                <p className="font-body text-muted-foreground text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.15), transparent)' }} />

      {/* Showcase */}
      <section id="showcase" className="py-32 px-6 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <SectionEyebrow number="03" label="Portfolio" />
            <h2 className="font-display text-4xl md:text-6xl font-medium mb-6">
              Stunning <span className="italic text-accent">Results</span>
            </h2>
            <p className="font-body text-muted-foreground max-w-xl mx-auto text-lg">
              Every room is a masterpiece. See what our AI can create.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { img: showcaseLiving, label: "Living Room · Modern" },
              { img: showcaseBedroom, label: "Bedroom · Luxury" },
              { img: showcaseKitchen, label: "Kitchen · Contemporary" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="group relative rounded-2xl overflow-hidden aspect-[4/5] cursor-pointer border border-white/[0.04] hover:shadow-dramatic transition-shadow duration-500"
              >
                <img
                  src={item.img}
                  alt={item.label}
                  className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <p className="font-body text-xs tracking-[0.2em] uppercase text-accent mb-1"><span className="inline-block w-1 h-1 rounded-full bg-accent mr-2 mb-[1px]" />AI Staged</p>
                  <p className="font-display text-xl text-primary-foreground font-medium">{item.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.15), transparent)' }} />


      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 bg-card/50 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, hsl(38 60% 55% / 0.04) 0%, transparent 70%)' }} />
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <SectionEyebrow number="05" label="Pricing" />
            <h2 className="font-display text-4xl md:text-6xl font-medium mb-8">
              Simple, <span className="italic text-accent">Transparent</span>
            </h2>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-card/60 backdrop-blur-sm">
              <button
                onClick={() => setBilling("monthly")}
                className={`relative font-body text-xs tracking-[0.15em] uppercase px-5 py-2 rounded-full transition-colors ${
                  billing === "monthly" ? "bg-foreground text-primary-foreground" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling("annual")}
                className={`relative font-body text-xs tracking-[0.15em] uppercase px-5 py-2 rounded-full transition-colors flex items-center gap-2 ${
                  billing === "annual" ? "bg-foreground text-primary-foreground" : "text-foreground/60 hover:text-foreground"
                }`}
              >
                Annual
                <span className="text-[9px] tracking-[0.1em] gold-gradient text-accent-foreground px-2 py-0.5 rounded-full font-semibold">
                  {ANNUAL_DISCOUNT_LABEL}
                </span>
              </button>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {PRICING_PLANS.map((plan, i) => {
              const displayPrice = priceLabel(plan, billing);
              const period = plan.monthly === 0 ? "" : "/mo";
              const shortFeatures = plan.features.slice(0, 5);
              const cardInner = (
                <>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-accent-foreground font-body text-[10px] tracking-[0.25em] uppercase font-semibold px-4 py-1 rounded-full z-10">
                      Most Popular
                    </div>
                  )}
                  <p className={`font-display text-lg font-medium mb-2 relative ${plan.highlight ? "text-primary-foreground" : ""}`}>{plan.name}</p>
                  <div className="flex items-baseline gap-1 mb-1 relative">
                    <span className={`font-display text-5xl font-light tracking-tight ${plan.highlight ? "text-accent" : "text-foreground"}`}>{displayPrice}</span>
                    <span className={`font-body text-sm ${plan.highlight ? "text-primary-foreground/50" : "text-muted-foreground"}`}>{period}</span>
                  </div>
                  <p className={`font-body text-[10px] tracking-[0.2em] uppercase mb-7 h-4 ${plan.highlight ? "text-primary-foreground/40" : "text-muted-foreground/70"}`}>
                    {billing === "annual" && plan.monthly > 0 ? "Billed annually" : ""}
                  </p>
                  <div className={`h-px w-12 mb-6 bg-accent/40 relative`} />
                  <ul className="space-y-3.5 mb-10 flex-grow relative">
                    {shortFeatures.map((f) => (
                      <li key={f} className="flex items-start gap-3 font-body text-sm">
                        <span className="mt-[7px] flex-shrink-0 w-2 h-px bg-accent" />
                        <span className={plan.highlight ? "text-primary-foreground/80" : "text-foreground/75"}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      if (plan.id === "free") {
                        navigate(user ? "/app" : "/auth");
                        return;
                      }
                      if (!user) {
                        navigate("/auth?next=/pricing");
                        return;
                      }
                      startCheckout(plan.id, billing);
                    }}
                    className={`relative w-full font-body font-semibold text-xs tracking-[0.2em] uppercase py-4 rounded-lg transition-all ${
                      plan.highlight
                        ? "gold-gradient-animated text-accent-foreground hover:opacity-90"
                        : "border border-border hover:border-accent/50 hover:text-accent text-foreground"
                    }`}
                  >
                    {plan.id === "free" ? "Start Free" : `Choose ${plan.name}`}
                  </button>
                </>
              );

              if (plan.highlight) {
                return (
                  <motion.div
                    key={plan.name}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={fadeUp}
                    custom={i}
                    onMouseMove={handleCardMouseMove}
                    className="p-10 rounded-2xl relative flex flex-col bg-foreground text-primary-foreground border border-accent/40 shadow-glow-gold ring-1 ring-accent/20 overflow-hidden group"
                  >
                    <motion.div
                      className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: glowBackground }}
                    />
                    {cardInner}
                  </motion.div>
                );
              }

              return (
                <motion.div
                  key={plan.name}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  custom={i}
                  className="p-10 rounded-2xl relative flex flex-col border border-border bg-gradient-to-b from-card/60 to-background/30 backdrop-blur-sm"
                >
                  {cardInner}
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.15), transparent)' }} />

      {/* Final CTA — editorial card on parchment */}
      <section className="py-32 px-6 bg-background relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, hsl(38 60% 55% / 0.05) 0%, transparent 60%)' }} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="relative z-10 max-w-5xl mx-auto"
        >
          <div className="relative rounded-3xl overflow-hidden border border-accent/20 bg-gradient-to-br from-card via-background to-card/60 shadow-dramatic gold-hairline p-10 md:p-16">
            <div className="grid md:grid-cols-[1.3fr_1fr] gap-10 md:gap-16 items-center">
              {/* Left: editorial copy */}
              <div>
                <SectionEyebrow number="06" label="Begin" />
                <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-medium mb-6 leading-[1.02] text-left">
                  Your next listing,<br />
                  <span className="italic text-accent">already staged.</span>
                </h2>
                <p className="font-body text-foreground/70 text-base md:text-lg mb-8 leading-relaxed">
                  Skip the warehouses, the movers, the four-figure invoices.
                  Upload a photo tonight — wake up to a portfolio that sells.
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <button
                    onClick={() => navigate("/auth")}
                    className="gold-gradient-animated text-accent-foreground font-body font-semibold text-sm px-10 py-4 rounded-lg tracking-[0.15em] uppercase hover:opacity-90 transition-opacity inline-flex items-center gap-2 group"
                  >
                    Stage 3 Rooms Free
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <span className="font-body text-xs text-muted-foreground tracking-wide">
                    No credit card required
                  </span>
                </div>
              </div>

              {/* Right: cost comparison */}
              <div className="relative md:border-l md:border-accent/15 md:pl-12">
                <p className="font-body text-[10px] tracking-[0.4em] uppercase text-accent mb-6">
                  The Math
                </p>
                <div className="space-y-5">
                  <div className="flex items-baseline justify-between pb-4 border-b border-border/40">
                    <span className="font-body text-sm text-muted-foreground">Traditional staging</span>
                    <span className="font-display text-2xl font-light text-foreground/60 line-through decoration-accent/50">$2,400<span className="text-xs">/mo</span></span>
                  </div>
                  <div className="flex items-baseline justify-between pb-4 border-b border-border/40">
                    <span className="font-body text-sm text-muted-foreground">Photographer + props</span>
                    <span className="font-display text-2xl font-light text-foreground/60 line-through decoration-accent/50">$800<span className="text-xs">/shoot</span></span>
                  </div>
                  <div className="flex items-baseline justify-between pt-2">
                    <span className="font-body text-sm font-semibold text-foreground">RealVision</span>
                    <span className="font-display text-3xl font-medium text-accent">$29<span className="text-base text-muted-foreground">/mo</span></span>
                  </div>
                </div>
                <p className="font-body text-[11px] tracking-wide text-muted-foreground mt-6 italic">
                  Same-day. Unlimited revisions. No contracts.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Landing;
