import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock, Palette, TrendingUp, Star, CheckCircle2, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";
import SectionEyebrow from "@/components/SectionEyebrow";
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
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 1.1]);

  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden grain-overlay">
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 px-6 transition-all duration-300 border-b border-border/10 ${scrolled ? "py-3 backdrop-blur-xl bg-foreground/95" : "py-5 backdrop-blur-md bg-background/20"}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Logo light />
          <div className="flex items-center gap-6">
            <a href="#features" className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors hidden md:block">Features</a>
            <a href="#showcase" className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors hidden md:block">Showcase</a>
            <button onClick={() => navigate("/pricing")} className="font-body text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors hidden md:block">Pricing</button>
            <button
              onClick={() => navigate("/auth")}
              className="font-body text-sm font-semibold gold-gradient text-accent-foreground px-6 py-2.5 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <motion.div className="absolute inset-0" style={{ opacity: heroOpacity, scale: heroScale }}>
          <img src={heroImage} alt="Luxury staged living room" className="w-full h-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-foreground/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-foreground/30" />
        </motion.div>

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
            {["Sell", "Properties"].map((word, idx) => (
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
              Faster
            </motion.span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={2}
            className="font-body text-lg md:text-xl text-primary-foreground/70 max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Transform vacant rooms into stunning, fully-furnished spaces in seconds.
            Our AI creates photorealistic staging that sells.
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
              Start Staging Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#showcase"
              className="font-body text-sm text-primary-foreground/60 hover:text-primary-foreground transition-colors border border-primary-foreground/20 px-8 py-4 rounded-lg hover:border-primary-foreground/40"
            >
              See Examples
            </a>
          </motion.div>

          {/* Trust bar */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={4}
            className="mt-20 border-t border-b border-primary-foreground/5 py-6 flex flex-wrap items-center justify-center gap-8 text-primary-foreground/40"
          >
            {["500+ Agents", "10,000+ Rooms Staged", "4.9★ Rating", "< 30s Processing"].map((stat) => (
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
            className="grid md:grid-cols-2 gap-6"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-elevated border border-border/30 group hover:shadow-dramatic transition-shadow duration-500">
              <img src={beforeVacant} alt="Vacant unfurnished room" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute top-4 left-4 bg-foreground/70 text-primary-foreground rounded-lg px-4 py-2 text-sm font-body font-semibold tracking-wide">
                Before
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-elevated border border-border/30 group hover:shadow-dramatic transition-shadow duration-500">
              <img src={afterStaged} alt="Same room virtually staged with furniture" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute top-4 left-4 gold-gradient-animated text-accent-foreground rounded-lg px-4 py-2 text-sm font-body font-semibold tracking-wide">
                After
              </div>
            </div>
          </motion.div>
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
            <SectionEyebrow number="02" label="Why RealVision" />
            <h2 className="font-display text-4xl md:text-6xl font-medium">
              The Future of <span className="italic text-accent">Staging</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Sparkles, title: "AI Intelligence", desc: "Our model understands room geometry, lighting, and design to create photorealistic results." },
              { icon: Clock, title: "30-Second Turnaround", desc: "No more waiting days for traditional staging. Get results in under a minute." },
              { icon: Palette, title: "6+ Design Styles", desc: "Modern, traditional, minimalist, Scandinavian, mid-century, and luxury aesthetics." },
              { icon: TrendingUp, title: "Sell 73% Faster", desc: "Staged homes sell significantly faster and for higher prices than vacant ones." },
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

      {/* Testimonials */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="text-center mb-16"
          >
            <SectionEyebrow number="04" label="Testimonials" />
            <h2 className="font-display text-4xl md:text-6xl font-medium">
              Trusted by <span className="italic text-accent">Top Agents</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Sarah Mitchell", role: "Luxury Real Estate, NYC", quote: "RealVision cut my listing time in half. The quality is indistinguishable from professional photography." },
              { name: "James Rivera", role: "Commercial Broker, LA", quote: "I've tried every virtual staging tool. Nothing comes close to the realism RealVision delivers." },
              { name: "Emily Chen", role: "Property Developer, SF", quote: "We stage 50+ units per month now. The ROI is extraordinary — every property sells faster." },
            ].map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="p-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-accent/15 transition-all duration-500"
              >
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className={`w-3.5 h-3.5 fill-accent text-accent${j === 0 ? ' drop-shadow-[0_0_4px_hsl(38_60%_55%/0.5)]' : ''}`} />
                  ))}
                </div>
                <span className="font-display text-3xl text-accent/20 leading-none block mb-2">"</span>
                <p className="font-body text-foreground/80 leading-relaxed mb-8 text-sm">{t.quote}</p>
                <div>
                  <p className="font-display font-medium text-sm">{t.name}</p>
                  <p className="font-body text-xs text-muted-foreground">{t.role}</p>
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
            <p className="text-accent font-body text-xs tracking-[0.3em] uppercase mb-4">Pricing</p>
            <h2 className="font-display text-4xl md:text-6xl font-medium mb-6">
              Simple, <span className="italic text-accent">Transparent</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Starter", price: "Free", period: "", features: ["3 rooms / month", "Standard quality", "All 6 design styles", "Compare up to 3 styles", "Watermarked exports"], highlight: false },
              { name: "Professional", price: "$29", period: "/mo", features: ["Unlimited rooms", "Ultra HD quality", "All 6+ styles", "Priority processing", "Download originals (no watermark)"], highlight: true },
              { name: "Studio", price: "$79", period: "/mo", features: ["Everything in Pro", "Higher monthly volume", "Priority email support", "Early access to new styles"], highlight: false },
            ].map((plan, i) => (
              <motion.div
                key={plan.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className={`rounded-2xl border relative ${
                  plan.highlight
                    ? "p-10 border-accent/30 bg-foreground text-primary-foreground shadow-glow-gold animate-pulse-glow"
                    : "p-8 border-border bg-card/40 backdrop-blur-sm"
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 gold-gradient text-accent-foreground font-body text-xs font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <p className="font-display text-lg font-medium mb-2">{plan.name}</p>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className={`font-display text-4xl font-semibold ${plan.highlight ? "text-accent" : ""}`}>{plan.price}</span>
                  <span className={`font-body text-sm ${plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 font-body text-sm">
                      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-accent" />
                      <span className={plan.highlight ? "text-primary-foreground/85" : "text-foreground/80"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate("/pricing")}
                  className={`w-full font-body font-semibold text-sm py-3.5 rounded-lg transition-all ${
                    plan.highlight
                      ? "gold-gradient-animated text-accent-foreground hover:opacity-90"
                      : "border border-border hover:border-accent/40 hover:text-accent text-foreground"
                  }`}
                >
                  See Details
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-3xl mx-auto" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.15), transparent)' }} />

      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-foreground/80 to-foreground/95" />
        </div>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, hsl(38 60% 55% / 0.06) 0%, transparent 50%)' }} />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative z-10 text-center max-w-3xl mx-auto"
        >
          <div className="mx-auto mb-8" style={{ width: 60, height: 1, background: 'linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.4), transparent)' }} />
          <h2 className="font-display text-4xl md:text-6xl lg:text-7xl font-medium text-primary-foreground mb-6 leading-[1.05]">
            Ready to <span className="italic text-accent">Transform</span> Your Listings?
          </h2>
          <p className="font-body text-lg text-primary-foreground/60 mb-10 max-w-xl mx-auto">
            Join hundreds of top-performing agents who close deals faster with AI-powered virtual staging.
          </p>
          <button
            onClick={() => navigate("/auth")}
            className="gold-gradient-animated text-accent-foreground font-body font-semibold text-base px-12 py-4 rounded-lg tracking-wide hover:opacity-90 transition-opacity inline-flex items-center gap-2 group"
          >
            Start Staging Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-12 px-6 bg-foreground/[0.03]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo />
          <p className="font-body text-sm text-muted-foreground">
            © 2026 RealVision. AI-powered virtual staging for real estate professionals.
          </p>
          <div className="flex gap-6">
            <a href="mailto:support@realvision.ai" className="font-body text-xs text-muted-foreground hover:text-accent transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
