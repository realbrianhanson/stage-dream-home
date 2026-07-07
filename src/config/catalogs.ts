// Shared catalogs for room types and design styles.
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
