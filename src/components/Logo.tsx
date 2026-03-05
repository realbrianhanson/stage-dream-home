import { Home } from "lucide-react";

interface LogoProps {
  className?: string;
  light?: boolean;
}

const Logo = ({ className = "", light = false }: LogoProps) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="relative">
        <div className={`w-9 h-9 rounded-lg gold-gradient flex items-center justify-center shadow-sm`}>
          <Home className="w-4.5 h-4.5 text-accent-foreground" strokeWidth={2.5} />
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className={`font-display text-lg font-semibold tracking-tight ${light ? "text-primary-foreground" : "text-foreground"}`}>
          Stage<span className="text-accent">AI</span>
        </span>
        <span className={`font-body text-[10px] tracking-[0.15em] uppercase ${light ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
          Virtual Staging
        </span>
      </div>
    </div>
  );
};

export default Logo;
