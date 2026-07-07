import { ReactNode } from "react";
import { motion } from "framer-motion";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}

const LegalPage = ({ eyebrow, title, updated, children }: LegalPageProps) => {
  return (
    <div className="min-h-screen bg-background grain-overlay">
      <MarketingNav />

      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
        className="max-w-3xl mx-auto px-6 pt-32 pb-20 sm:pt-40 sm:pb-28"
      >
        <header className="mb-16 text-center">
          <p className="font-body text-[10px] tracking-[0.5em] uppercase text-accent mb-6">
            {eyebrow}
          </p>
          <h1
            className="font-display font-light text-foreground mb-8 leading-[1.05]"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4.5rem)" }}
          >
            {title}
          </h1>
          <div className="flex items-center justify-center gap-4">
            <div className="h-px w-12 bg-accent/40" />
            <p className="font-body text-[10px] tracking-[0.4em] uppercase text-muted-foreground">
              Last updated · {updated}
            </p>
            <div className="h-px w-12 bg-accent/40" />
          </div>
        </header>

        <div className="legal-prose space-y-10 font-body text-foreground/85 leading-relaxed">
          {children}
        </div>

        <footer className="mt-24 pt-10 border-t border-border/40 text-center">
          <p className="font-body text-xs text-muted-foreground">
            Questions?{" "}
            <a
              href="mailto:support@realvision.ai"
              className="text-accent hover:underline underline-offset-4"
            >
              support@realvision.ai
            </a>
          </p>
        </footer>
      </motion.article>

      <MarketingFooter />
    </div>
  );
};

export default LegalPage;
