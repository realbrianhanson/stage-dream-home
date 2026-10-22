// Real RealVision results on our sample photos (free Pexels photos plus our
// own empty bedroom and kitchen), each aligned to its original so the
// before/after line never jumps. Used by the landing page.
import type { DemoPair } from "@/components/InteractiveDemo";
import type { ToolId } from "@/config/tools";
import archedBefore from "@/assets/pair-arched-before.jpg";
import archedAfter from "@/assets/pair-arched-after.jpg";
import exteriorBefore from "@/assets/pair-exterior-before.jpg";
import exteriorSky from "@/assets/pair-exterior-sky.jpg";
import exteriorDusk from "@/assets/pair-exterior-dusk.jpg";
import exteriorLawn from "@/assets/pair-exterior-lawn.jpg";
import livedInBefore from "@/assets/pair-livedin-before.jpg";
import livedInDeclutter from "@/assets/pair-livedin-declutter.jpg";
import livedInEmpty from "@/assets/pair-livedin-empty.jpg";
import bedroomBefore from "@/assets/pair-bedroom-before.jpg";
import bedroomRecolor from "@/assets/pair-bedroom-recolor.jpg";

export type ShowcasePair = DemoPair & { id: string };

const WIDE = { width: 1920, height: 1280 };

const ARCHED = {
  before: archedBefore,
  beforeAlt: "An empty living room with a tall arched window, vaulted ceiling and oak floors",
};
const EXTERIOR = {
  before: exteriorBefore,
  beforeAlt: "A white colonial house with a dormant lawn under a flat grey sky",
};
const LIVED_IN = {
  before: livedInBefore,
  beforeAlt: "A lived-in living room with a cluttered desk, a box of papers on the floor and personal items",
};

/** One real example for every tool. */
export const TOOL_EXAMPLES: Record<ToolId, ShowcasePair> = {
  stage: {
    id: "stage",
    ...WIDE,
    ...ARCHED,
    after: archedAfter,
    afterAlt: "The same room staged with a cream sofa, a walnut coffee table, two lounge chairs and a woven rug",
    afterLabel: "Staged, Modern",
  },
  remove: {
    id: "remove",
    ...WIDE,
    ...LIVED_IN,
    after: livedInEmpty,
    afterAlt: "The same room completely empty, showing the parquet floor, radiators and tall windows",
    afterLabel: "Furniture removed",
  },
  declutter: {
    id: "declutter",
    ...WIDE,
    ...LIVED_IN,
    after: livedInDeclutter,
    afterAlt: "The same room with the furniture and plants kept and the papers, boxes and clutter cleared away",
    afterLabel: "Decluttered",
  },
  recolor: {
    id: "recolor",
    width: 1600,
    height: 1280,
    before: bedroomBefore,
    beforeAlt: "An empty bedroom with brown walls and dark wood floors",
    after: bedroomRecolor,
    afterAlt: "The same bedroom with the walls repainted warm white",
    afterLabel: "Walls in warm white",
  },
  dusk: {
    id: "dusk",
    ...WIDE,
    ...EXTERIOR,
    after: exteriorDusk,
    afterAlt: "The same house at twilight with warm light in the windows and a sunset sky",
    afterLabel: "Day to dusk",
  },
  sky: {
    id: "sky",
    ...WIDE,
    ...EXTERIOR,
    after: exteriorSky,
    afterAlt: "The same house under a clear blue sky with white clouds",
    afterLabel: "Blue sky",
  },
  lawn: {
    id: "lawn",
    ...WIDE,
    ...EXTERIOR,
    after: exteriorLawn,
    afterAlt: "The same house with a lush green lawn and freshly mulched beds",
    afterLabel: "Lawn refreshed",
  },
};

/** The hero's switcher: the four most striking transformations. */
export const HERO_EXAMPLES: Array<{ tab: string; pair: ShowcasePair }> = [
  { tab: "Furnish a room", pair: TOOL_EXAMPLES.stage },
  { tab: "Day to dusk", pair: TOOL_EXAMPLES.dusk },
  { tab: "Declutter", pair: TOOL_EXAMPLES.declutter },
  { tab: "Repaint walls", pair: TOOL_EXAMPLES.recolor },
];
