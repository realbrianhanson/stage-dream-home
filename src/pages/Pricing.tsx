import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, X, Minus, ChevronDown } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/hooks/useAuth";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.25, 0.4, 0.25, 1] as [number, number, number, number] },
  }),
};

type Billing = "monthly" | "annual";

const plans = [
  {
    name: "Starter",
    monthly: 0,
    annual: 0,
    blurb: "Try the magic. Stage your first listings free.",
    cta: "Start Free",
    features: [
      "3 stagings per month",
      "Standard quality output",
      "All 6 design styles",
      "Compare up to 3 styles",
      "Watermarked downloads",
    ],
    highlight: false,
  },
  {
    name: "Professional",
    monthly: 29,
    annual: 24,
    blurb: "For agents and photographers staging weekly.",
    cta: "Get Professional",
    features: [
      "Unlimited stagings",
      "Ultra HD quality",
      "All 6+ design styles",
      "Priority processing queue",
      "Download originals (no watermark)",
      "Personal stagings library",
      "Email support",
    ],
    highlight: true,
  },
  {
    name: "Brokerage",
    monthly: 99,
    annual: 82,
    blurb: "For teams and high-volume brokerages.",
    cta: "Contact Sales",
    features: [
      "Everything in Professional",
      "Up to 10 team accounts",
      "API access",
      "Custom branding on exports",
      "Bulk uploads",
      "Dedicated account manager",
      "SLA & priority support",
    ],
    highlight: false,
  },
];

const compareRows: { label: string; values: (string | boolean)[] }[] = [
  { label: "Monthly stagings", values: ["3", "Unlimited", "Unlimited"] },
  { label: "Output quality", values: ["Standard", "Ultra HD", "Ultra HD"] },
  { label: "Design styles", values: ["6", "6+", "6+"] },
  { label: "Multi-style compare", values: ["Up to 3", "Up to 6", "Up to 6"] },
  { label: "Watermark-free downloads", values: [false, true, true] },
  { label: "Priority processing", values: [false, true, true] },
  { label: "Stagings library", values: [true, true, true] },
  { label: "Team accounts", values: [false, false, "Up to 10"] },
  { label: "API access", values: [false, false, true] },
  { label: "Custom branding", values: [false, false, true] },
  { label: "Dedicated manager", values: [false, false, true] },
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
    a: "Yes. Your room photos are private to your account and never used to train models. See our Privacy Policy for full details.",
  },
  {
    q: "Do you have an API or white-label option?",
    a: "Brokerage plans include API access. For white-label and enterprise contracts, get in touch with our sales team.",
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleCta = (planName: string) => {
    if (planName === "Brokerage") {
      window.location.href = "mailto:sales@realvision.ai?subject=Brokerage%20Plan%20Inquiry";
      return;
    }
    navigate(user ? "/app" : "/auth");
  };

  return (
    <div className="min-h-screen bg-background grain-overlay overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 backdrop-blur-xl bg-foreground/95 border-b border-border/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={() => navigate("/")}>
            <Logo light />
          </button>
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate("/")}
              className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors hidden sm:block"
            >
              Home
            </button>
            <button
              onClick={() => navigate(user ? "/app" : "/auth")}
              className="font-body text-sm font-semibold gold-gradient text-accent-foreground px-5 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              {user ? "Open App" : "Get Started"}
            </button>
          </div>
        </div>
      </nav>

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
                Save 17%
              </span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Plans */}
      <section className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 md:gap-8 items-stretch">
          {plans.map((plan, i) => {
            const price = billing === "monthly" ? plan.monthly : plan.annual;
            return (
              <motion.div
                key={plan.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className={`flex flex-col rounded-2xl border relative ${
                  plan.highlight
                    ? "p-8 md:p-10 border-accent/30 bg-foreground text-primary-foreground shadow-glow-gold animate-pulse-glow"
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
                    {price === 0 ? "Free" : `$${price}`}
                  </span>
                  {price > 0 && (
                    <span className={`font-body text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      /mo
                    </span>
                  )}
                </div>
                <p className={`font-body text-xs mb-8 h-4 ${plan.highlight ? "text-primary-foreground/40" : "text-muted-foreground/70"}`}>
                  {price > 0 && billing === "annual" ? `billed annually ($${price * 12}/yr)` : ""}
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
                  onClick={() => handleCta(plan.name)}
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
            className="rounded-2xl border border-border bg-card/40 overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-body text-xs font-medium uppercase tracking-wider text-muted-foreground px-6 py-5">Feature</th>
                    {plans.map((p) => (
                      <th key={p.name} className={`text-center font-display text-base font-medium px-6 py-5 ${p.highlight ? "text-accent" : ""}`}>
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map((row, i) => (
                    <tr key={row.label} className={i !== compareRows.length - 1 ? "border-b border-border/50" : ""}>
                      <td className="font-body text-sm text-foreground/80 px-6 py-4">{row.label}</td>
                      {row.values.map((v, j) => (
                        <td key={j} className="text-center px-6 py-4">
                          {typeof v === "boolean" ? (
                            v ? (
                              <CheckCircle2 className="w-4 h-4 text-accent inline" />
                            ) : (
                              <Minus className="w-4 h-4 text-muted-foreground/40 inline" />
                            )
                          ) : (
                            <span className="font-body text-sm text-foreground/80">{v}</span>
                          )}
                        </td>
                      ))}
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
                    <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-6 pb-5 font-body text-sm text-muted-foreground leading-relaxed">
                      {faq.a}
                    </div>
                  )}
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

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6 bg-card/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo />
          <p className="font-body text-sm text-muted-foreground">
            © 2026 RealVision. All rights reserved.
          </p>
          <div className="flex gap-6">
            <button onClick={() => navigate("/")} className="font-body text-xs text-muted-foreground hover:text-accent transition-colors">Home</button>
            <a href="mailto:support@realvision.ai" className="font-body text-xs text-muted-foreground hover:text-accent transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Pricing;
