// Pure request/quota helpers for stage-room. No Deno or network imports so
// vitest can cover them from src/test.
import { isKnownRoomType, isKnownStyle } from "./catalog.ts";

export const MODES = ["stage", "remove", "refine"] as const;
export type StageMode = (typeof MODES)[number];

export interface StageRequest {
  /** Public URL of the original in the caller's storage folder. */
  originalUrl: string | null;
  /** Legacy: a data URL straight from the browser. */
  imageData: string | null;
  /** Existing staging to edit (refine), owned by the caller. */
  parentId: string | null;
  mode: StageMode;
  roomType: string;
  style: string;
  customInstructions: string;
  refineInstruction: string;
  palette: string;
  aspectRatio: string | null;
  wantsMlsLabel: boolean;
  propertyName: string;
  variations: number;
  model: string | null;
}

export type ParseResult =
  | { ok: true; value: StageRequest }
  | { ok: false; code: string; message: string };

export const MAX_INSTRUCTIONS = 300;
export const MAX_REFINE = 240;
export const MAX_PALETTE = 200;
export const MAX_PROPERTY = 160;
export const MAX_VARIATIONS = 4;
export const VALID_RATIOS = ["16:9", "4:3", "3:4", "1:1"] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const clip = (v: unknown, max: number): string =>
  typeof v === "string" ? v.slice(0, max).trim() : "";

/**
 * Validate the stage-room body before any quota is reserved, so a bad request
 * never costs the user a credit.
 */
export function parseStageBody(body: unknown): ParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, code: "bad_body", message: "Invalid request." };
  }
  const b = body as Record<string, unknown>;

  const mode: StageMode = (MODES as readonly string[]).includes(b.mode as string) ? (b.mode as StageMode) : "stage";

  const originalUrl = typeof b.originalUrl === "string" && b.originalUrl.startsWith("https://") ? b.originalUrl : null;
  const legacy = typeof b.image === "string" ? b.image : "";
  const imageData = legacy.startsWith("data:image/") ? legacy : null;
  const legacyUrl = !originalUrl && legacy.startsWith("https://") ? legacy : null;
  const parentId = typeof b.parentId === "string" && UUID.test(b.parentId) ? b.parentId : null;

  if (!originalUrl && !imageData && !legacyUrl && !parentId) {
    return { ok: false, code: "no_image", message: "Please upload an image to stage" };
  }

  const refineInstruction = clip(b.refineInstruction, MAX_REFINE);
  if (mode === "refine" && !refineInstruction) {
    return { ok: false, code: "empty_refine", message: "Please describe what to change." };
  }

  const ratio = typeof b.aspectRatio === "string" ? b.aspectRatio : "";
  const aspectRatio = (VALID_RATIOS as readonly string[]).includes(ratio) ? ratio : null;

  const rawStyle = clip(b.style, 80).replace(/\s*\(refined\)\s*$/i, "");
  const rawRoom = clip(b.roomType, 80);
  const n = Number.isInteger(b.variations) ? (b.variations as number) : 1;

  return {
    ok: true,
    value: {
      originalUrl: originalUrl ?? legacyUrl,
      imageData,
      parentId,
      mode,
      roomType: isKnownRoomType(rawRoom) ? rawRoom : "Living Room",
      style: isKnownStyle(rawStyle) ? rawStyle : "Modern",
      customInstructions: clip(b.customInstructions, MAX_INSTRUCTIONS),
      refineInstruction,
      palette: clip(b.palette, MAX_PALETTE),
      aspectRatio,
      wantsMlsLabel: b.mls_disclosure === true && mode !== "remove",
      propertyName: clip(b.propertyName, MAX_PROPERTY),
      variations: Math.min(MAX_VARIATIONS, Math.max(1, n)),
      model: typeof b.model === "string" ? b.model.slice(0, 80) : null,
    },
  };
}

/**
 * Storage path for a public stagings URL, only if it sits in this user's
 * folder. Anything else (another user's file, another host) returns null.
 */
export function ownedStoragePath(url: string, supabaseUrl: string, userId: string): string | null {
  const prefix = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/stagings/`;
  if (!url.startsWith(prefix)) return null;
  const path = decodeURIComponent(url.slice(prefix.length).split("?")[0]);
  if (path.includes("..") || !path.startsWith(`${userId}/`)) return null;
  return path;
}

export type ReserveResult = "ok" | "quota_exceeded" | "rate_limited" | "no_usage";

/** Map a reserve_staging() result that isn't "ok" to an HTTP status and message. */
export function reserveFailure(result: string, plan: string): { status: number; message: string } {
  switch (result) {
    case "rate_limited":
      return { status: 429, message: "You're staging too fast. Please wait a minute before trying again." };
    case "quota_exceeded":
      return plan === "free"
        ? { status: 402, message: "You've reached your free staging limit this month. Upgrade for more stagings." }
        : { status: 402, message: "You've reached your plan's monthly staging limit. It resets 30 days after your cycle started." };
    default:
      return { status: 403, message: "Could not verify your account. Please sign out and back in." };
  }
}
