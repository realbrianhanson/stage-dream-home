import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { parseStageBody, reserveFailure, type StageRequest } from "../_shared/staging.ts";

// --- Server-side watermark (free plan only) ---
let cachedFont: Uint8Array | null = null;
async function loadFont(): Promise<Uint8Array | null> {
  if (cachedFont) return cachedFont;
  const sources = [
    "https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Bold.ttf",
    "https://raw.githubusercontent.com/googlefonts/roboto/main/src/hinted/Roboto-Bold.ttf",
  ];
  for (const url of sources) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      cachedFont = new Uint8Array(await res.arrayBuffer());
      return cachedFont;
    } catch (_) {
      // try next
    }
  }
  return null;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

// --- Paid-plan upscale cap ---
const MAX_LONG_EDGE = 3000;

function paintWatermark(img: Image, font: Uint8Array | null) {
  if (!font) {
    // Font unavailable — draw a solid pill in the corner so free files are still marked.
    const barH = Math.max(28, Math.round(img.height * 0.04));
    const bar = new Image(img.width, barH).fill(0x000000aa);
    img.composite(bar, 0, img.height - barH);
    return;
  }
  const fontSize = Math.max(22, Math.round(img.width * 0.028));
  const text = "Staged by RealVision";
  const textImg = Image.renderText(font, fontSize, text, 0xffffffcc);
  const padX = Math.round(img.width * 0.02);
  const padY = Math.round(img.height * 0.02);
  const x = Math.max(0, img.width - textImg.width - padX);
  const y = Math.max(0, img.height - textImg.height - padY);
  const shadow = Image.renderText(font, fontSize, text, 0x00000099);
  img.composite(shadow, x + 2, y + 2);
  img.composite(textImg, x, y);
}

function paintMlsLabel(img: Image, font: Uint8Array) {
  const fontSize = Math.max(20, Math.round(img.width * 0.022));
  const text = "Virtually Staged";
  const textImg = Image.renderText(font, fontSize, text, 0xffffffbf); // ~75% opacity
  const padX = Math.round(img.width * 0.02);
  const padY = Math.round(img.height * 0.02);
  const x = padX;
  const y = Math.max(0, img.height - textImg.height - padY);
  const shadow = Image.renderText(font, fontSize, text, 0x00000099);
  img.composite(shadow, x + 2, y + 2);
  img.composite(textImg, x, y);
}

interface PostprocessOpts {
  watermark: boolean; // free-plan RealVision mark, bottom-right
  mlsLabel: boolean;  // "Virtually Staged", bottom-left
  upscale: boolean;   // paid-plan hi-res upscale
}

/**
 * Single decode/encode pass that optionally upscales, then paints the MLS
 * disclosure label (bottom-left) and/or the free-plan watermark (bottom-right).
 * Falls back gracefully on upscale failure and returns the source URL unchanged
 * if nothing needs to happen.
 */
async function postprocessImage(sourceUrl: string, opts: PostprocessOpts): Promise<string> {
  if (!opts.watermark && !opts.mlsLabel && !opts.upscale) return sourceUrl;

  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error("Failed to fetch generated image for postprocessing");
  const bytes = new Uint8Array(await res.arrayBuffer());
  const decoded = await decode(bytes);
  if (!(decoded instanceof Image)) throw new Error("Unsupported image format");
  let img: Image = decoded;

  // Upscale first so any overlays are painted at final resolution.
  if (opts.upscale) {
    const longEdge = Math.max(img.width, img.height);
    const targetsFor = (factor: number) => {
      const capped = Math.min(longEdge * factor, MAX_LONG_EDGE);
      const scale = capped / longEdge;
      return {
        w: Math.max(1, Math.round(img.width * scale)),
        h: Math.max(1, Math.round(img.height * scale)),
      };
    };
    let upscaled: Image | null = null;
    for (const factor of [2, 1.5]) {
      try {
        const { w, h } = targetsFor(factor);
        if (w === img.width && h === img.height) break; // already at cap
        upscaled = img.clone().resize(w, h);
        break;
      } catch (err) {
        console.warn(`Upscale ${factor}x failed, trying smaller:`, err);
      }
    }
    if (upscaled) img = upscaled;
  }

  if (opts.mlsLabel || opts.watermark) {
    const font = await loadFont();
    // The disclosure must be readable text; fail rather than ship it unlabeled.
    if (opts.mlsLabel && !font) throw new Error("mls_font_unavailable");
    if (opts.mlsLabel && font) paintMlsLabel(img, font);
    if (opts.watermark) paintWatermark(img, font);
  }

  const out = await img.encode();
  return `data:image/png;base64,${bytesToBase64(out)}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GENERIC_ERROR = "Something went wrong staging your room. Please try again.";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const normalizeRoomType = (raw: string) => {
  const lower = raw.toLowerCase().trim();
  const map: Record<string, string> = {
    "outdoor / patio": "outdoor patio space",
    "outdoor/patio": "outdoor patio space",
  };
  return map[lower] ?? lower.replace(/\s*\/\s*/g, " ").replace(/\s+/g, " ");
};

function buildPrompt(r: StageRequest): string {
  const safeRoomType = normalizeRoomType(r.roomType);
  const safeStyle = r.style.toLowerCase();
  let prompt: string;

  if (r.mode === "refine") {
    prompt = `You are refining a virtually staged real estate photo. Take this image and apply ONLY the following change requested by the client: "${r.refineInstruction}".

CRITICAL RULES — the output MUST match the input image in every way EXCEPT the requested change:
- Keep the EXACT same room, architecture, walls, windows, doors, flooring, ceiling and built-in fixtures.
- Keep the EXACT same camera angle, framing, perspective, focal length and lighting direction.
- Keep the overall staging composition, style and materials the same. Do NOT re-stage from scratch.
- Do NOT modify furniture or decor that the instruction does not explicitly touch.
- Only modify what the instruction specifies.

The result must be photorealistic and indistinguishable from a real photograph of a ${safeRoomType}, matching the ${safeStyle} style of the input.`;
  } else if (r.mode === "remove") {
    prompt = `You are a professional virtual de-staging specialist. Take this photo of a furnished ${safeRoomType} and digitally remove ALL furniture, decor, rugs, artwork, plants, lamps, curtains, and personal items.

The result must show a completely empty, vacant ${safeRoomType} with only the bare architecture remaining: walls, floors, ceiling, windows, doors, and built-in fixtures (kitchen counters, bathroom fixtures, fireplaces, built-in shelving). Patch and reconstruct any areas where furniture was hiding the floor or walls so they look natural, clean, and continuous.

CRITICAL: Keep the room's architecture, walls, windows, flooring material, ceiling, and lighting EXACTLY the same. Do not add anything new. Do not change wall colors. Do not stage. The output must be photorealistic, evenly lit, and indistinguishable from a real photograph of an empty room.`;
  } else {
    prompt = `You are a professional interior designer and virtual stager. Take this photo of an empty/vacant ${safeRoomType} and virtually stage it with beautiful ${safeStyle} style furniture and decor.

Add appropriate furniture like sofas, tables, chairs, rugs, lamps, artwork, plants, and decorative accessories. Make the room look warm, inviting, and ready for a real estate listing. Keep the room's architecture, walls, windows, and flooring exactly the same. Only add furniture and decor. Make it look photorealistic and professionally staged.`;
  }

  if (r.customInstructions && r.mode !== "refine") {
    prompt += `\n\nAdditional requirements from the client: ${r.customInstructions}`;
  }
  if (r.palette && r.mode !== "remove") {
    prompt += `\n\nThis room is part of a whole-home staging. Use a consistent furniture collection and palette across rooms: ${r.palette}. Keep the same design language, wood tones, metal finishes, and textile palette so all rooms in this listing feel professionally coordinated.`;
  }
  if (r.aspectRatio && r.mode !== "refine") {
    prompt += `\n\nIMPORTANT: Generate the image with a ${r.aspectRatio} aspect ratio.`;
  }
  return prompt;
}

interface Outcome {
  response: Response;
  success: boolean;
  error: string | null;
}

const fail = (status: number, message: string, error: string): Outcome => ({
  response: json(status, { error: message }),
  success: false,
  error,
});

interface Ctx {
  userId: string | null;
  plan: string | null;
  request: StageRequest | null;
  reserved: boolean;
}

async function callGateway(apiKey: string, prompt: string, image: string): Promise<Outcome | string> {
  let response: Response;
  try {
    response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });
  } catch (err) {
    console.error("AI gateway fetch failed:", err);
    return fail(502, GENERIC_ERROR, `gateway_fetch: ${(err as Error)?.message || "unknown"}`);
  }

  if (response.status === 429) {
    return fail(429, "You're staging too fast! Please wait a moment and try again.", "gateway_429");
  }
  if (response.status === 402) {
    // Our gateway credits ran out, not the user's plan.
    return fail(503, "Staging is temporarily unavailable. Please try again shortly.", "gateway_402");
  }
  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.error("AI gateway error:", response.status, errorText);
    return fail(502, GENERIC_ERROR, `gateway_${response.status}: ${errorText}`);
  }

  const data = await response.json().catch(() => null);
  const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  return url ?? fail(502, GENERIC_ERROR, "no_staged_url");
}

async function handle(req: Request, ctx: Ctx): Promise<Outcome> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return fail(401, "No authorization header", "no_auth");

  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return fail(401, "Unauthorized", "unauthorized");
  ctx.userId = user.id;

  // Validate everything before reserving a credit.
  const body = await req.json().catch(() => null);
  const parsed = parseStageBody(body);
  if (!parsed.ok) return fail(400, parsed.message, parsed.code);
  const request = parsed.value;
  ctx.request = request;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return fail(500, "Staging service is not configured. Please contact support.", "missing_api_key");

  const { data: usageRow } = await userClient.from("usage").select("*").eq("user_id", user.id).maybeSingle();
  const isAdmin = usageRow?.is_admin === true;
  const plan = isAdmin ? "admin" : ((usageRow?.plan as string | undefined) ?? "free");
  ctx.plan = plan;

  // reserve_staging() ships in a migration that may land after this code
  // deploys; until then fall back to the legacy boolean RPC.
  let { data: reserve, error: reserveError } = await userClient.rpc("reserve_staging");
  if (reserveError?.code === "PGRST202") {
    const legacy = await userClient.rpc("check_and_increment_staging", { p_user_id: user.id });
    reserveError = legacy.error;
    reserve = legacy.data === true ? "ok" : "quota_exceeded";
  }
  if (reserveError) {
    console.error("reserve_staging error:", reserveError);
    return fail(500, "Could not verify staging quota. Please try again.", `quota_rpc: ${reserveError.message}`);
  }
  if (reserve !== "ok") {
    const { status, message } = reserveFailure(String(reserve), plan);
    return fail(status, message, String(reserve));
  }
  ctx.reserved = true;

  const generated = await callGateway(apiKey, buildPrompt(request), request.image);
  if (typeof generated !== "string") return generated;

  const isFree = plan === "free";
  let stagedImageUrl = generated;
  try {
    stagedImageUrl = await postprocessImage(generated, {
      watermark: isFree,
      mlsLabel: request.wantsMlsLabel,
      upscale: !isFree,
    });
  } catch (err) {
    console.error("Postprocess failed:", err);
    // Free output must carry the watermark and labelled output must carry the
    // disclosure; only a plain paid upscale may fall back to the raw image.
    if (isFree || request.wantsMlsLabel) {
      return fail(500, "Failed to finalize your image. Please try again.", `postprocess: ${(err as Error)?.message || "unknown"}`);
    }
  }

  return {
    response: json(200, {
      stagedImageUrl,
      plan,
      isWatermarked: isFree,
      mlsDisclosure: request.wantsMlsLabel,
    }),
    success: true,
    error: null,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ctx: Ctx = { userId: null, plan: null, request: null, reserved: false };

  let outcome: Outcome;
  try {
    outcome = await handle(req, ctx);
  } catch (err) {
    console.error("Stage room error:", err);
    outcome = fail(500, GENERIC_ERROR, `unhandled: ${(err as Error)?.message || "unknown"}`);
  }

  // Any reserved credit that didn't produce an image goes back to the user.
  if (ctx.reserved && !outcome.success && ctx.userId) {
    const { error } = await admin.rpc("decrement_staging", { p_user_id: ctx.userId });
    if (error) console.error("decrement_staging failed:", error);
  }

  const r = ctx.request;
  admin
    .from("generation_logs")
    .insert({
      user_id: ctx.userId,
      kind: r?.mode ?? "stage",
      room_type: r?.roomType ?? null,
      style: r?.style ?? null,
      plan: ctx.plan,
      success: outcome.success,
      error_text: outcome.error ? outcome.error.slice(0, 2000) : null,
      duration_ms: Date.now() - startedAt,
      mls_disclosure: r?.wantsMlsLabel ?? false,
    })
    .then(({ error }) => {
      if (error) console.error("generation_logs insert failed:", error);
    });

  return outcome.response;
});
