// Shared catalogs for room types, design styles, and coordinated palettes.
// Single source of truth so RoomUploader, BatchStaging, and any future
// surfaces stay in sync.

export const ROOM_TYPES = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Dining Room",
  "Bathroom",
  "Home Office",
  "Outdoor / Patio",
  "Basement",
  "Nursery",
  "Home Gym",
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export const STYLES = [
  "Modern",
  "Traditional",
  "Minimalist",
  "Scandinavian",
  "Mid-Century",
  "Luxury",
  "Farmhouse",
  "Industrial",
  "Coastal",
  "Japandi",
  "Boho",
  "Transitional",
] as const;

export type DesignStyle = (typeof STYLES)[number];

// 6 curated coordinated palettes per style. Each palette is a short
// human-readable description of wood tones, textiles, and metal finishes
// that gets appended to the AI prompt so every room of a listing shares
// the same visual language.
export const PALETTES: Record<DesignStyle, string[]> = {
  Modern: [
    "warm oak, cream boucle, aged brass accents",
    "smoked walnut, charcoal linen, matte black hardware",
    "light ash, ivory wool, brushed nickel accents",
    "greige plaster walls, camel leather, bronze accents",
    "pale oak, soft sage textiles, blackened steel details",
    "chalk white walls, oat tones, warm brass fixtures",
  ],
  Traditional: [
    "mahogany wood, deep burgundy textiles, antique brass",
    "cherry wood, hunter green velvet, polished brass",
    "walnut millwork, cream damask, oil-rubbed bronze",
    "chestnut floors, navy toile, aged gold accents",
    "warm oak paneling, ivory silk, pewter details",
    "rosewood furniture, warm cream fabrics, antique gold",
  ],
  Minimalist: [
    "white oak, pure white cotton, matte black accents",
    "pale birch, off-white linen, brushed steel",
    "bleached ash, ecru textiles, warm chrome",
    "light concrete, ivory wool, blackened brass",
    "natural maple, warm white cotton, matte nickel",
    "pale plaster, greige linen, matte black fixtures",
  ],
  Scandinavian: [
    "pale ash, chalk white linen, matte black accents",
    "light oak, cream sheepskin, brushed steel",
    "blonde birch, dove grey wool, aged brass",
    "whitewashed pine, soft cream textiles, warm chrome",
    "natural beech, pale grey linen, blackened iron",
    "bleached oak, warm ivory boucle, matte brass",
  ],
  "Mid-Century": [
    "warm walnut, mustard velvet, brass accents",
    "teak wood, burnt orange fabric, patinated brass",
    "rosewood, olive green wool, brushed brass",
    "walnut veneer, camel leather, antique gold",
    "afromosia wood, rust textiles, aged brass",
    "smoked oak, avocado green upholstery, warm bronze",
  ],
  Luxury: [
    "book-matched walnut, ivory cashmere, polished brass",
    "ebony wood, champagne silk, antique gold accents",
    "smoked oak, taupe velvet, brushed bronze",
    "rosewood millwork, oyster mohair, satin nickel",
    "burl walnut, cognac leather, polished chrome",
    "onyx marble tones, ivory boucle, warm gold",
  ],
  Farmhouse: [
    "reclaimed pine, ivory linen, oil-rubbed bronze",
    "whitewashed oak, cream ticking stripe, aged iron",
    "warm barnwood, soft sage, matte black hardware",
    "distressed walnut, buttermilk cotton, pewter accents",
    "shiplap white walls, natural jute, antique brass",
    "weathered pine, warm cream wool, wrought iron",
  ],
  Industrial: [
    "reclaimed oak, charcoal linen, blackened steel",
    "raw concrete, cognac leather, aged iron",
    "smoked walnut, slate grey wool, matte black metal",
    "salvaged pine, rust canvas, gunmetal accents",
    "exposed brick tones, oatmeal cotton, patinated brass",
    "dark walnut, graphite textiles, brushed steel",
  ],
  Coastal: [
    "bleached oak, sea salt white linen, brushed nickel",
    "whitewashed pine, soft sky blue cotton, aged brass",
    "pale driftwood, ivory canvas, weathered chrome",
    "sandy oak, sea foam textiles, brushed silver",
    "chalk white walls, pale sand jute, polished nickel",
    "warm birch, dune-colored linen, matte pewter",
  ],
  Japandi: [
    "pale oak, warm ivory linen, blackened steel",
    "bleached ash, oat wool, matte black accents",
    "warm paulownia, chalk white cotton, aged bronze",
    "natural cedar, sand-toned textiles, matte iron",
    "light hinoki wood, dove grey linen, warm brass",
    "pale beech, warm ecru boucle, blackened brass",
  ],
  Boho: [
    "warm rattan, cream macramé, aged brass",
    "reclaimed teak, terracotta textiles, hammered copper",
    "light cane, ivory wool, patinated gold",
    "warm walnut, ochre and rust fabrics, antique brass",
    "bleached cane, soft blush linen, brushed gold",
    "natural jute, warm cream boucle, matte brass",
  ],
  Transitional: [
    "warm oak, greige linen, brushed brass",
    "walnut wood, ivory wool, satin nickel",
    "pale ash, taupe velvet, aged bronze",
    "smoked oak, cream boucle, polished chrome",
    "light walnut, dove grey textiles, warm brass",
    "natural oak, oat linen, brushed nickel",
  ],
};

export const isKnownStyle = (s: string): s is DesignStyle =>
  (STYLES as readonly string[]).includes(s);

export const getPalettesForStyle = (style: string): string[] => {
  return isKnownStyle(style) ? PALETTES[style] : PALETTES.Modern;
};

// Deterministic palette pick for a batch: same style + same seed → same palette
// so all rooms in a listing coordinate. Seed is any short string (e.g. property
// name, or the batch id, or the first file name).
export const pickPaletteForBatch = (style: string, seed: string): string => {
  const palettes = getPalettesForStyle(style);
  let hash = 0;
  const src = `${style}::${seed || "default"}`;
  for (let i = 0; i < src.length; i++) {
    hash = (hash * 31 + src.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % palettes.length;
  return palettes[idx];
};
