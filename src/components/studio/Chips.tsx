import { cn } from "@/lib/utils";

interface ChipOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface ChipsProps {
  label: string;
  options: ChipOption[];
  /** Selected values; one for single-select. */
  selected: string[];
  onToggle: (value: string) => void;
  hint?: string;
  className?: string;
}

/** Squared, keyboard-friendly choice chips (single or multi select). */
const Chips = ({ label, options, selected, onToggle, hint, className }: ChipsProps) => (
  <fieldset className={className}>
    <legend className="text-sm font-medium text-foreground mb-2.5">{label}</legend>
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = selected.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            disabled={o.disabled}
            onClick={() => onToggle(o.value)}
            className={cn(
              "h-9 px-3.5 rounded-md border text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
              on
                ? "border-accent bg-accent-soft text-accent font-medium"
                : "border-border bg-background text-foreground/80 hover:border-foreground/30 hover:text-foreground",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
    {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
  </fieldset>
);

export default Chips;
