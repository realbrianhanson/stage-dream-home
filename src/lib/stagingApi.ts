import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { uploadStagingImage } from "@/lib/uploadStagingImage";

export type StagingRow = Tables<"stagings">;

export type StageMode = "stage" | "remove" | "refine";

export interface StageParams {
  /** Public URL of an original already in the user's folder. */
  originalUrl?: string;
  /** Existing staging to edit (refine). */
  parentId?: string;
  mode: StageMode;
  roomType: string;
  style: string;
  customInstructions?: string;
  refineInstruction?: string;
  palette?: string;
  aspectRatio?: string;
  mlsDisclosure?: boolean;
  propertyName?: string;
  variations?: number;
  /** Admin-only model override. */
  model?: string;
}

export interface StageResult {
  stagings: StagingRow[];
  isWatermarked: boolean;
  plan: string;
  model: string;
}

export class StagingError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
  get isQuota() {
    return this.status === 402;
  }
}

/** Pull the friendly message out of a non-2xx edge function response. */
async function readError(error: unknown): Promise<StagingError> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === "function") {
    try {
      const body = await ctx.clone().json();
      if (body?.error) return new StagingError(String(body.error), ctx.status);
    } catch {
      // not JSON
    }
    return new StagingError("Something went wrong staging your room. Please try again.", ctx.status);
  }
  return new StagingError(
    error instanceof Error && !/non-2xx/.test(error.message)
      ? error.message
      : "Couldn't reach the staging service. Check your connection and try again.",
    0,
  );
}

/** Upload a browser image (data URL) as the original and return its public URL. */
export async function uploadOriginal(userId: string, image: string): Promise<string> {
  if (image.startsWith("http")) return image;
  return uploadStagingImage(userId, crypto.randomUUID(), image, "original");
}

/** Run a staging on the server, which saves the images and returns the rows. */
export async function stageRoom(params: StageParams): Promise<StageResult> {
  const { data, error } = await supabase.functions.invoke("stage-room", {
    body: {
      originalUrl: params.originalUrl,
      parentId: params.parentId,
      mode: params.mode,
      roomType: params.roomType,
      style: params.style,
      customInstructions: params.customInstructions || undefined,
      refineInstruction: params.refineInstruction || undefined,
      palette: params.palette || undefined,
      aspectRatio: params.aspectRatio || undefined,
      mls_disclosure: !!params.mlsDisclosure,
      propertyName: params.propertyName || undefined,
      variations: params.variations ?? 1,
      model: params.model || undefined,
    },
  });
  if (error) throw await readError(error);
  if (!data?.stagings?.length) throw new StagingError("No image came back. Please try again.", 502);
  return {
    stagings: data.stagings as StagingRow[],
    isWatermarked: !!data.isWatermarked,
    plan: String(data.plan ?? ""),
    model: String(data.model ?? ""),
  };
}
