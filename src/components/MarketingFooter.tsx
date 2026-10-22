import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const footerLink =
  "font-body text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const MarketingFooter = () => (
  <footer className="border-t border-border bg-background">
    <div className="max-w-[1240px] mx-auto px-4 sm:px-6 py-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-2">
        <Logo />
        <p className="font-body text-sm text-muted-foreground">
          Virtual staging and photo edits for real estate listings.
        </p>
      </div>
      <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link to="/pricing" className={footerLink}>Pricing</Link>
        <Link to="/privacy" className={footerLink}>Privacy</Link>
        <Link to="/terms" className={footerLink}>Terms</Link>
        <a href="mailto:support@realvision.ai" className={footerLink}>Contact</a>
      </nav>
    </div>
    <div className="border-t border-border">
      <p className="max-w-[1240px] mx-auto px-4 sm:px-6 py-4 font-body text-xs text-muted-foreground tabular-nums">
        © {new Date().getFullYear()} RealVision
      </p>
    </div>
  </footer>
);

export default MarketingFooter;
