import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, Minus, ChevronDown } from "lucide-react";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";
import { useAuth } from "@/hooks/useAuth";
import { PRICING_PLANS, ANNUAL_DISCOUNT_LABEL, priceLabel, yearlyTotal, type BillingPeriod, type PlanId } from "@/config/pricing";
import { startCheckout } from "@/lib/billing";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  }),
};

type Billing = BillingPeriod;

const compareRows: { label: string; values: (string | boolean)[] }[] = [
  { label: "Monthly stagings", values: ["3", "Unlimited (fair use)", "500"] },
  { label: "Output quality", values: ["Standard", "High-resolution", "High-resolution"] },
  { label: "Design styles", values: ["6", "6+", "6+"] },
  { label: "Multi-style compare", values: ["Up to 3", "Up to 6", "Up to 6"] },
  { label: "Watermark-free downloads", values: [false, true, true] },
  { label: "Stagings library", values: [true, true, true] },
  { label: "Public share links", values: [true, true, true] },
  { label: "Priority support", values: [false, false, true] },
  { label: "Early access to new styles", values: [false, false, true] },
];

const faqs = [
  {
    q: "How does the free plan work?",
    a: "You get 3 stagings every month, no credit card required. Generated images include a small watermark. Upgrade anytime to remove it and unlock unlimited stagings.",
  },
  {
    q: "What counts as a 'staging'?",
    a: "Each generated image of a room counts as one staging. If you compare 3 styles for the same room, that's 3 stagings.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Subscriptions cancel at the end of the billing period — you keep access until then. Annual plans are non-refundable but never auto-renew without notice.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 7-day money-back guarantee on all paid plans, no questions asked.",
  },
  {
    q: "Is my data private?",
    a: "Yes. Your photos are stored at long, unguessable private URLs, and only your account can browse your gallery. Public share links are created only when you explicitly generate one. Your images are never used to train models. See our Privacy Policy for full details.",
  },
  {
    q: "Do you have an API or white-label option?",
    a: "Not yet. We're focused on the core staging experience first. If you're interested in API access or white-labeling, drop us a line and we'll keep you posted.",
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCta = (planId: PlanId) => {
    if (planId === "free") {
      navigate(user ? "/app" : "/auth");
      return;
    }
    if (!user) {
      navigate("/auth?next=/pricing");
      return;
    }
    startCheckout(planId, billing);
  };

  return (
    <div className="min-h-screen bg-background grain-overlay overflow-x-hidden">
      <MarketingNav />

      {/* Hero */}
      <section className="pt-40 pb-16 px-6 relative">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, hsl(38 60% 55% / 0.06) 0%, transparent 70%)' }} />
        <div className="max-w-4xl mx-auto text-center relative">
          <motion.p initial="hidden" animate="visible" variants={fadeUp} className="text-accent font-body text-xs tracking-[0.3em] uppercase mb-4">
            Pricing
          </motion.p>
          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="font-display font-medium leading-[1.05] mb-6" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>
            Simple plans for <span className="italic text-accent">every agent</span>
          </motion.h1>
          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="font-body text-lg text-muted-foreground max-w-2xl mx-auto mb-10">
            Start free. Upgrade when you're ready to scale. Cancel anytime — no contracts, no surprises.
          </motion.p>

          {/* Billing toggle */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="inline-flex items-center gap-1 p-1 rounded-full border border-border bg-card/50">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-full font-body text-sm transition-all ${billing === "monthly" ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              className={`px-5 py-2 rounded-full font-body text-sm transition-all flex items-center gap-2 ${billing === "annual" ? "bg-foreground text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Annual
              <span className="text-[10px] font-semibold tracking-wider uppercase text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded">
                {ANNUAL_DISCOUNT_LABEL}
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 md:gap-8 items-stretch">
          {PRICING_PLANS.map((plan, i) => {
            const displayPrice = priceLabel(plan, billing);
            const showYearly = billing === "annual" && plan.monthly > 0;
            return (
              <motion.div
                key={plan.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className={`flex flex-col rounded-2xl border relative ${
                  plan.highlight
                    ? "p-8 md:p-10 border-accent/30 bg-foreground text-primary-foreground shadow-glow-gold"
                    : "p-8 border-border bg-card/40 backdrop-blur-sm"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-accent-foreground font-body text-xs font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <p className="font-display text-xl font-medium mb-1">{plan.name}</p>
                <p className={`font-body text-sm mb-6 ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                  {plan.blurb}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`font-display text-5xl font-semibold ${plan.highlight ? "text-accent" : ""}`}>
                    {displayPrice}
                  </span>
                  {plan.monthly > 0 && (
                    <span className={`font-body text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      /mo
                    </span>
                  )}
                </div>
                <p className={`font-body text-xs mb-8 h-4 ${plan.highlight ? "text-primary-foreground/40" : "text-muted-foreground/70"}`}>
                  {showYearly ? yearlyTotal(plan) : ""}
                </p>

                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 font-body text-sm">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-accent mt-0.5" />
                      <span className={plan.highlight ? "text-primary-foreground/85" : "text-foreground/80"}>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCta(plan.id)}
                  className={`w-full font-body font-semibold text-sm py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 group ${
                    plan.highlight
                      ? "gold-gradient-animated text-accent-foreground hover:opacity-90"
                      : "border border-border hover:border-accent/40 hover:text-accent text-foreground"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.15), transparent)' }} />

      {/* Comparison table */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <p className="text-accent font-body text-xs tracking-[0.3em] uppercase mb-4">Compare</p>
            <h2 className="font-display text-3xl md:text-5xl font-medium">
              Every feature, <span className="italic text-accent">side by side</span>
            </h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={1}
            className="rounded-2xl border border-border/60 bg-card/30 backdrop-blur-sm overflow-hidden shadow-soft"
          >
            <div
              className="overflow-x-auto"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
                maskImage:
                  "linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)",
              }}
            >
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border/60 bg-foreground/[0.02]">
                    <th className="text-left font-body text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground px-6 py-6">Feature</th>
                    {PRICING_PLANS.map((p) => (
                      <th
                        key={p.name}
                        className={`text-center px-6 py-6 ${p.highlight ? "relative" : ""}`}
                      >
                        {p.highlight && (
                          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-16" style={{ background: "linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.6), transparent)" }} />
                        )}
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-display text-lg font-medium ${p.highlight ? "text-accent" : "text-foreground"}`}>
                            {p.name}
                          </span>
                          {p.highlight && (
                            <span className="font-body text-[9px] tracking-[0.3em] uppercase text-accent/70">
                              Most Popular
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row, i) => (
                    <tr
                      key={row.label}
                      className={`${i !== compareRows.length - 1 ? "border-b border-border/40" : ""} hover:bg-foreground/[0.015] transition-colors`}
                    >
                      <td className="font-body text-sm text-foreground/85 px-6 py-4">{row.label}</td>
                      {row.values.map((v, j) => {
                        const isHighlighted = PRICING_PLANS[j]?.highlight;
                        return (
                          <td
                            key={j}
                            className={`text-center px-6 py-4 ${isHighlighted ? "bg-accent/[0.025]" : ""}`}
                          >
                            {typeof v === "boolean" ? (
                              v ? (
                                <CheckCircle2 className={`w-4 h-4 inline ${isHighlighted ? "text-accent" : "text-accent/70"}`} />
                              ) : (
                                <Minus className="w-4 h-4 text-muted-foreground/30 inline" />
                              )
                            ) : (
                              <span className={`font-body text-sm ${isHighlighted ? "text-foreground font-medium" : "text-foreground/75"}`}>{v}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.15), transparent)' }} />

      {/* FAQ */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mb-12">
            <p className="text-accent font-body text-xs tracking-[0.3em] uppercase mb-4">FAQ</p>
            <h2 className="font-display text-3xl md:text-5xl font-medium">
              Common <span className="italic text-accent">questions</span>
            </h2>
          </motion.div>

          <div className="space-y-3">
            {faqs.map((faq, i) => {
              const open = openFaq === i;
              return (
                <motion.div
                  key={faq.q}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i * 0.5}
                  className="rounded-xl border border-border bg-card/40 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-card/80 transition-colors"
                  >
                    <span className="font-body font-medium text-foreground">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-accent" : ""}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {open && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.25, 0.4, 0.25, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-5 font-body text-sm text-muted-foreground leading-relaxed">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 relative overflow-hidden bg-foreground text-primary-foreground">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, hsl(38 60% 55% / 0.08) 0%, transparent 60%)' }} />
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative z-10 text-center max-w-2xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-medium mb-6 leading-[1.1]">
            Ready to <span className="italic text-accent">stage smarter?</span>
          </h2>
          <p className="font-body text-primary-foreground/60 mb-10">
            Start with 3 free stagings. No credit card. No commitment.
          </p>
          <button
            onClick={() => navigate(user ? "/app" : "/auth")}
            className="gold-gradient-animated text-accent-foreground font-body font-semibold text-base px-10 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity inline-flex items-center gap-2 group"
          >
            {user ? "Open App" : "Start Staging Free"}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </section>

      <MarketingFooter />
    </div>
  );
};

export default Pricing;
