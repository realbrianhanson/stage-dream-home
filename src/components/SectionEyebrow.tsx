interface SectionEyebrowProps {
  number?: string;
  label: string;
  light?: boolean;
}

const SectionEyebrow = ({ number, label, light = false }: SectionEyebrowProps) => {
  const color = light ? "text-primary-foreground/60" : "text-accent";
  const ruleColor = light
    ? "linear-gradient(90deg, transparent, hsl(40 33% 97% / 0.4), transparent)"
    : "linear-gradient(90deg, transparent, hsl(38 60% 55% / 0.5), transparent)";

  return (
    <div className="flex items-center justify-center gap-3 mb-5">
      <span
        className="inline-block"
        style={{ width: 32, height: 1, background: ruleColor }}
      />
      {number && (
        <span className={`font-body text-[10px] tracking-[0.3em] uppercase ${color} opacity-70`}>
          {number}
        </span>
      )}
      <span className={`font-body text-[11px] tracking-[0.4em] uppercase ${color}`}>
        {label}
      </span>
      <span
        className="inline-block"
        style={{ width: 32, height: 1, background: ruleColor }}
      />
    </div>
  );
};

export default SectionEyebrow;
