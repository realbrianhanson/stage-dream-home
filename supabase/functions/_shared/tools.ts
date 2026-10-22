// Photo tools beyond staging. Shared by the UI (labels, which inputs to show)
// and stage-room (prompt wording), so both always agree.

export const TOOL_IDS = ["stage", "remove", "declutter", "dusk", "sky", "lawn", "recolor"] as const;
export type ToolId = (typeof TOOL_IDS)[number];

export const RECOLOR_TARGETS = ["walls", "floors", "cabinets"] as const;
export type RecolorTarget = (typeof RECOLOR_TARGETS)[number];

export interface ToolInfo {
  id: ToolId;
  label: string;
  blurb: string;
  /** Uses design style + room type. */
  usesStyle: boolean;
  /** Needs a target + finish (recolor). */
  usesTarget: boolean;
  /** Mostly for exterior photos. */
  exterior: boolean;
  /** MLS boards treat it as a virtual change that should be disclosed. */
  disclose: boolean;
}

export const TOOLS: ToolInfo[] = [
  { id: "stage", label: "Add furniture", blurb: "Stage an empty room in any style", usesStyle: true, usesTarget: false, exterior: false, disclose: true },
  { id: "remove", label: "Remove furniture", blurb: "Show a furnished room empty", usesStyle: false, usesTarget: false, exterior: false, disclose: true },
  { id: "declutter", label: "Declutter", blurb: "Clear personal items, keep the furniture", usesStyle: false, usesTarget: false, exterior: false, disclose: true },
  { id: "recolor", label: "Recolor", blurb: "Preview new paint, floors or cabinets", usesStyle: false, usesTarget: true, exterior: false, disclose: true },
  { id: "dusk", label: "Day to dusk", blurb: "Twilight glow with the lights on", usesStyle: false, usesTarget: false, exterior: true, disclose: true },
  { id: "sky", label: "Blue sky", blurb: "Swap a grey sky for a clear one", usesStyle: false, usesTarget: false, exterior: true, disclose: true },
  { id: "lawn", label: "Refresh lawn", blurb: "Green, tidy grass and beds", usesStyle: false, usesTarget: false, exterior: true, disclose: true },
];

export const toolInfo = (id: string): ToolInfo => TOOLS.find((t) => t.id === id) ?? TOOLS[0];

export const isToolId = (s: unknown): s is ToolId => typeof s === "string" && (TOOL_IDS as readonly string[]).includes(s);

export const isRecolorTarget = (s: unknown): s is RecolorTarget =>
  typeof s === "string" && (RECOLOR_TARGETS as readonly string[]).includes(s);

/** Style label saved on the staging row for non-staging tools. */
export const toolStyleLabel = (id: ToolId, style: string, target?: string): string => {
  switch (id) {
    case "stage":
      return style;
    case "remove":
      return "Removed";
    case "recolor":
      return `Recolor ${target ?? "walls"}`;
    default:
      return toolInfo(id).label;
  }
};
