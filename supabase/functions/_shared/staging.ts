// Pure request/quota helpers for stage-room. No Deno or network imports so
// vitest can cover them from src/test.

export type StageMode = "stage" | "remove" | "refine";

export interface StageRequest {
  image: string;
  mode: StageMode;
  roomType: string;
  style: string;
  customInstructions: string;
  refineInstruction: string;
  palette: string;
  aspectRatio: string | null;
  wantsMlsLabel: boolean;
}

export type ParseResult =
  | { ok: true; value: StageRequest }
  | { ok: false; code: string; message: string };

export const MAX_INSTRUCTIONS = 300;
export const MAX_REFINE = 240;
export const MAX_PALETTE = 200;
export const MAX_LABEL = 80;
export const VALID_RATIOS = ["16:9", "4:3", "3:4", "1:1"] as const;

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

  const image = typeof b.image === "string" ? b.image : "";
  if (!image || !(image.startsWith("data:image/") || image.startsWith("https://"))) {
    return { ok: false, code: "no_image", message: "Please upload an image to stage" };
  }

  const mode: StageMode = b.mode === "remove" ? "remove" : b.mode === "refine" ? "refine" : "stage";
  const refineInstruction = clip(b.refineInstruction, MAX_REFINE);
  if (mode === "refine" && !refineInstruction) {
    return { ok: false, code: "empty_refine", message: "Please describe what to change." };
  }

  const ratio = typeof b.aspectRatio === "string" ? b.aspectRatio : "";
  const aspectRatio = (VALID_RATIOS as readonly string[]).includes(ratio) ? ratio : null;

  return {
    ok: true,
    value: {
      image,
      mode,
      roomType: clip(b.roomType, MAX_LABEL) || "room",
      style: clip(b.style, MAX_LABEL) || "Modern",
      customInstructions: clip(b.customInstructions, MAX_INSTRUCTIONS),
      refineInstruction,
      palette: clip(b.palette, MAX_PALETTE),
      aspectRatio,
      wantsMlsLabel: b.mls_disclosure === true && mode !== "remove",
    },
  };
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
