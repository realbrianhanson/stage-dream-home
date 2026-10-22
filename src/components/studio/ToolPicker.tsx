import { Sofa, PackageOpen, Sparkles, Paintbrush, Sunset, CloudSun, Trees } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOOLS, type ToolId } from "@/config/tools";

const ICONS: Record<ToolId, LucideIcon> = {
  stage: Sofa,
  remove: PackageOpen,
  declutter: Sparkles,
  recolor: Paintbrush,
  dusk: Sunset,
  sky: CloudSun,
  lawn: Trees,
};

interface ToolPickerProps {
  value: ToolId;
  onChange: (tool: ToolId) => void;
  suggested?: ToolId | null;
}

const ToolGroup = ({ title, tools, value, onChange, suggested }: ToolPickerProps & { title: string; tools: typeof TOOLS }) => (
  <div>
    <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
    <div className="grid grid-cols-2 gap-2">
      {tools.map((t) => {
        const Icon = ICONS[t.id];
        const on = value === t.id;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative text-left rounded-lg border p-3 transition-colors",
              on ? "border-accent bg-accent-soft" : "border-border bg-background hover:border-foreground/30",
            )}
          >
            <Icon className={cn("w-4 h-4 mb-2", on ? "text-accent" : "text-muted-foreground")} aria-hidden />
            <span className={cn("block text-sm font-medium", on ? "text-accent" : "text-foreground")}>{t.label}</span>
            <span className="block text-xs text-muted-foreground leading-snug mt-0.5">{t.blurb}</span>
            {suggested === t.id && !on && (
              <span className="absolute top-2.5 right-2.5 text-[11px] font-medium text-accent">Suggested</span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

/** Interior and exterior photo tools as large tappable cards. */
const ToolPicker = (props: ToolPickerProps) => (
  <div className="space-y-4">
    <ToolGroup {...props} title="Interiors" tools={TOOLS.filter((t) => !t.exterior)} />
    <ToolGroup {...props} title="Exteriors" tools={TOOLS.filter((t) => t.exterior)} />
  </div>
);

export default ToolPicker;
