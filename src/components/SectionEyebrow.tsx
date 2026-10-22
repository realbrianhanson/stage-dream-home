interface SectionEyebrowProps {
  label: string;
  className?: string;
}

/** Small sentence-case label that sits above a section heading. */
const SectionEyebrow = ({ label, className = "" }: SectionEyebrowProps) => (
  <p className={`font-body text-sm font-medium text-accent mb-3 ${className}`}>{label}</p>
);

export default SectionEyebrow;
