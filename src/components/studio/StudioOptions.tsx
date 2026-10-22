import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Chips from "@/components/studio/Chips";
import { ROOM_TYPES, STYLES, getPalettesForStyle } from "@/config/catalogs";
import { RECOLOR_TARGETS, toolInfo, type RecolorTarget, type ToolId } from "@/config/tools";
import { cn } from "@/lib/utils";

const INSTRUCTION_IDEAS = [
  "Pet-friendly furniture",
  "Family-friendly",
  "Warm earth tones",
  "Bright and airy",
  "Add a home office nook",
  "Large area rug",
  "Statement lighting",
  "Indoor plants",
];

const FINISH_IDEAS: Record<RecolorTarget, string[]> = {
  walls: ["Warm white", "Soft greige", "Pale sage", "Light blue-grey", "Deep navy accent"],
  floors: ["Light white oak", "Natural mid-tone oak", "Dark walnut", "Grey luxury vinyl plank", "Large-format light porcelain tile"],
  cabinets: ["Bright white shaker", "Sage green shaker", "Navy blue", "Natural rift oak", "Matte black"],
};

const ASPECT_RATIOS = [
  { value: "", label: "Match photo" },
  { value: "16:9", label: "16:9" },
  { value: "4:3", label: "4:3" },
  { value: "3:4", label: "3:4" },
  { value: "1:1", label: "1:1" },
];

export const MAX_INSTRUCTIONS = 300;

export interface StudioState {
  tool: ToolId;
  roomType: string;
  style: string;
  compare: boolean;
  compareStyles: string[];
  variations: number;
  recolorTarget: RecolorTarget;
  finish: string;
  aspectRatio: string;
  propertyName: string;
  mlsDisclosure: boolean;
  instructions: string;
  palette: string;
  model: string;
}

interface StudioOptionsProps {
  state: StudioState;
  set: <K extends keyof StudioState>(key: K, value: StudioState[K]) => void;
  isFree: boolean;
  isAdmin: boolean;
  maxCompare: number;
  adminModels: { value: string; label: string }[];
}

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
  <label className="block">
    <span className="block text-sm font-medium text-foreground mb-2">{label}</span>
    {children}
    {hint && <span className="block mt-1.5 text-xs text-muted-foreground">{hint}</span>}
  </label>
);

const inputClass =
  "w-full h-10 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring";

/** Every option for the chosen tool, shown only when it applies. */
const StudioOptions = ({ state, set, isFree, isAdmin, maxCompare, adminModels }: StudioOptionsProps) => {
  const [showMore, setShowMore] = useState(!!state.instructions || !!state.palette);
  const tool = toolInfo(state.tool);
  const isStage = state.tool === "stage";
  const showsRoom = !tool.exterior;
  const disclosable = tool.disclose && state.tool !== "remove" && state.tool !== "declutter";

  const toggleCompareStyle = (s: string) => {
    const cur = state.compareStyles;
    if (cur.includes(s)) {
      if (cur.length > 1) set("compareStyles", cur.filter((x) => x !== s));
    } else if (cur.length < maxCompare) {
      set("compareStyles", [...cur, s]);
    }
  };

  return (
    <div className="space-y-6">
      {showsRoom && (
        <Chips
          label="Room"
          options={ROOM_TYPES.filter((r) => r !== "Outdoor / Patio" || isStage).map((r) => ({ value: r, label: r }))}
          selected={[state.roomType]}
          onToggle={(v) => set("roomType", v)}
        />
      )}

      {isStage && (
        <div>
          <Chips
            label={state.compare ? `Styles to compare (up to ${maxCompare})` : "Style"}
            options={STYLES.map((s) => ({ value: s, label: s }))}
            selected={state.compare ? state.compareStyles : [state.style]}
            onToggle={(v) => (state.compare ? toggleCompareStyle(v) : set("style", v))}
          />
          <label className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-[hsl(var(--accent))]"
              checked={state.compare}
              onChange={(e) => {
                set("compare", e.target.checked);
                if (e.target.checked) set("compareStyles", [state.style]);
              }}
            />
            Compare several styles side by side
          </label>
        </div>
      )}

      {isStage && !state.compare && !isFree && (
        <Chips
          label="Options to generate"
          options={[1, 2, 4].map((n) => ({
            value: String(n),
            label: n === 1 ? "1 image" : `${n} images`,
            disabled: state.mlsDisclosure && n > 2,
          }))}
          selected={[String(state.variations)]}
          onToggle={(v) => set("variations", Number(v))}
          hint={state.variations > 1 ? `Each option uses one staging. You pick the one you like.` : undefined}
        />
      )}

      {state.tool === "recolor" && (
        <div className="space-y-4">
          <Chips
            label="What to change"
            options={RECOLOR_TARGETS.map((t) => ({ value: t, label: t[0].toUpperCase() + t.slice(1) }))}
            selected={[state.recolorTarget]}
            onToggle={(v) => set("recolorTarget", v as RecolorTarget)}
          />
          <Field label="New color or material">
            <input
              value={state.finish}
              maxLength={80}
              onChange={(e) => set("finish", e.target.value)}
              placeholder={`e.g. ${FINISH_IDEAS[state.recolorTarget][0]}`}
              className={inputClass}
            />
          </Field>
          <div className="flex flex-wrap gap-1.5 -mt-2">
            {FINISH_IDEAS[state.recolorTarget].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => set("finish", f)}
                className="text-xs text-muted-foreground hover:text-accent underline-offset-4 hover:underline"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      )}

      {isStage && (
        <Chips
          label="Output shape"
          options={ASPECT_RATIOS}
          selected={[state.aspectRatio]}
          onToggle={(v) => set("aspectRatio", v)}
        />
      )}

      <Field label="Property" hint="Groups photos of one listing so you can share or export them together.">
        <input
          value={state.propertyName}
          maxLength={160}
          onChange={(e) => set("propertyName", e.target.value)}
          placeholder="e.g. 123 Oak Street"
          className={inputClass}
        />
      </Field>

      {disclosable && (
        <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-3.5 cursor-pointer">
          <span>
            <span className="block text-sm font-medium">"Virtually staged" label</span>
            <span className="block text-xs text-muted-foreground mt-0.5">
              Adds a small disclosure in the corner. Many MLS boards require it.
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--accent))]"
            checked={state.mlsDisclosure}
            onChange={(e) => {
              set("mlsDisclosure", e.target.checked);
              if (e.target.checked && state.variations > 2) set("variations", 2);
            }}
          />
        </label>
      )}

      {(isStage || isAdmin) && (
        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            aria-expanded={showMore}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            More options
            <ChevronDown className={cn("w-4 h-4 transition-transform", showMore && "rotate-180")} />
          </button>

          {showMore && (
            <div className="mt-4 space-y-5">
              {isStage && (
                <div>
                  <Field label="Notes for the stager">
                    <textarea
                      value={state.instructions}
                      onChange={(e) => set("instructions", e.target.value.slice(0, MAX_INSTRUCTIONS))}
                      rows={3}
                      placeholder="e.g. Keep it family-friendly with a large sectional"
                      className={cn(inputClass, "h-auto py-2.5 resize-none")}
                    />
                  </Field>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1.5">
                    {INSTRUCTION_IDEAS.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => {
                          const cur = state.instructions.trim();
                          if (cur.toLowerCase().includes(idea.toLowerCase())) return;
                          const next = cur ? `${cur}, ${idea.toLowerCase()}` : idea;
                          if (next.length <= MAX_INSTRUCTIONS) set("instructions", next);
                        }}
                        className="text-xs text-muted-foreground hover:text-accent underline-offset-4 hover:underline"
                      >
                        + {idea}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isStage && !state.compare && (
                <Field label="Matching palette" hint="Locks woods, fabrics and metals so every room of a listing coordinates.">
                  <select value={state.palette} onChange={(e) => set("palette", e.target.value)} className={inputClass}>
                    <option value="">Let the stager choose</option>
                    {getPalettesForStyle(state.style).map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {isAdmin && (
                <Field label="Image model (admin only)" hint="Each result records which model made it.">
                  <select value={state.model} onChange={(e) => set("model", e.target.value)} className={inputClass}>
                    {adminModels.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudioOptions;
