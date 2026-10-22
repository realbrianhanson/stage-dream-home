import { ReactNode } from "react";
import MarketingNav from "@/components/MarketingNav";
import MarketingFooter from "@/components/MarketingFooter";

interface LegalPageProps {
  eyebrow: string;
  title: string;
  updated: string;
  children: ReactNode;
}

const LegalPage = ({ eyebrow, title, updated, children }: LegalPageProps) => (
  <div className="min-h-screen bg-background">
    <MarketingNav />

    <main className="px-4 sm:px-6">
      <article className="max-w-2xl mx-auto pt-16 pb-20 md:pt-24 md:pb-28">
        <header className="mb-12 border-b border-border pb-8">
          <p className="font-body text-sm font-medium text-accent mb-3">{eyebrow}</p>
          <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] text-foreground">{title}</h1>
          <p className="mt-4 font-body text-sm text-muted-foreground">Last updated {updated}</p>
        </header>

        <div className="space-y-10 font-body text-base text-foreground/85 leading-relaxed">{children}</div>

        <footer className="mt-16 pt-8 border-t border-border">
          <p className="font-body text-sm text-muted-foreground">
            Questions?{" "}
            <a href="mailto:support@realvision.ai" className="text-accent underline-offset-4 hover:underline">
              support@realvision.ai
            </a>
          </p>
        </footer>
      </article>
    </main>

    <MarketingFooter />
  </div>
);

export default LegalPage;
