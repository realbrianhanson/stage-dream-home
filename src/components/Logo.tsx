interface LogoProps {
  className?: string;
  light?: boolean;
}

const Logo = ({ className = "", light = false }: LogoProps) => {
  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex flex-col leading-none">
        <span className={`font-display text-lg font-semibold tracking-tight ${light ? "text-primary-foreground" : "text-foreground"}`}>
          Real<span className="text-accent">Vision</span>
        </span>
        <span className={`font-body text-[10px] tracking-[0.15em] uppercase ${light ? "text-primary-foreground/50" : "text-muted-foreground"}`}>
          Virtual Staging
        </span>
      </div>
    </div>
  );
};

export default Logo;
