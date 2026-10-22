import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";
import { ownedStoragePath, parseStageBody, reserveFailure, type StageRequest } from "../_shared/staging.ts";
import { buildPrompt } from "../_shared/prompts.ts";
import { imageDimensions } from "../_shared/sizing.ts";
import {
  DEFAULT_CHAIN,
  FAST_CHAIN,
  GatewayError,
  KNOWN_MODELS,
  generateWithFallback,
  type GeneratedImage,
  type SourceImage,
} from "../_shared/models.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GENERIC_ERROR = "Something went wrong staging your room. Please try again.";
const PUBLIC_BUCKET = "stagings";
const MASTER_BUCKET = "staging-masters";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// --- Labels: free-plan watermark and MLS disclosure ---------------------------

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

function paintText(img: Image, font: Uint8Array, text: string, size: number, color: number, x: number | "right" | "center", y: number | "bottom" | "center") {
  const label = Image.renderText(font, size, text, color);
  const shadow = Image.renderText(font, size, text, 0x00000088);
  const pad = Math.round(img.width * 0.02);
  const px = x === "right" ? img.width - label.width - pad : x === "center" ? Math.round((img.width - label.width) / 2) : x;
  const py = y === "bottom" ? img.height - label.height - pad : y === "center" ? Math.round((img.height - label.height) / 2) : y;
  img.composite(shadow, Math.max(0, px + 2), Math.max(0, py + 2));
  img.composite(label, Math.max(0, px), Math.max(0, py));
}

interface Finish {
  watermark: boolean;
  mlsLabel: boolean;
}

/**
 * Turn model output into the JPEG we store. Labels are painted at full
 * resolution; if the disclosure or watermark can't be drawn we fail rather
 * than ship an unlabelled image.
 */
async function finishImage(src: GeneratedImage, opts: Finish): Promise<Uint8Array> {
  const needsPaint = opts.watermark || opts.mlsLabel;
  const isJpeg = src.mime.includes("jpeg") || src.mime.includes("jpg");
  if (!needsPaint && isJpeg) return src.bytes;

  const decoded = await decode(src.bytes);
  if (!(decoded instanceof Image)) throw new Error("Unsupported image format");
  const img: Image = decoded;

  if (needsPaint) {
    const font = await loadFont();
    if (!font) throw new Error("label_font_unavailable");
    const pad = Math.round(img.width * 0.02);
    if (opts.mlsLabel) {
      paintText(img, font, "Virtually Staged", Math.max(20, Math.round(img.width * 0.022)), 0xffffffd0, pad, "bottom");
    }
    if (opts.watermark) {
      paintText(img, font, "RealVision", Math.max(48, Math.round(img.width * 0.08)), 0xffffff40, "center", "center");
      paintText(img, font, "Staged free with RealVision", Math.max(20, Math.round(img.width * 0.022)), 0xffffffcc, "right", "bottom");
    }
  }
  return await img.encodeJPEG(90);
}

// --- Request handling ----------------------------------------------------------

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
  reserved: number;
  used: number;
  model: string | null;
}

interface Source {
  image: SourceImage;
  originalUrl: string;
  parent: Record<string, unknown> | null;
}

function dataUrlToBytes(dataUrl: string): { bytes: Uint8Array; mime: string } {
  const [head, b64] = dataUrl.split(",");
  return {
    mime: head.match(/:(.*?);/)?.[1] ?? "image/jpeg",
    bytes: Uint8Array.from(atob(b64 ?? ""), (c) => c.charCodeAt(0)),
  };
}

async function sourceFrom(bytes: Uint8Array, mime: string): Promise<SourceImage> {
  let dims = imageDimensions(bytes);
  if (!dims) {
    const d = await decode(bytes).catch(() => null);
    dims = d instanceof Image ? { width: d.width, height: d.height } : { width: 1536, height: 1024 };
  }
  return { bytes, mime, ...dims };
}

async function download(admin: SupabaseClient, bucket: string, path: string) {
  const { data, error } = await admin.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`download_failed: ${bucket}/${path}`);
  return { bytes: new Uint8Array(await data.arrayBuffer()), mime: data.type || "image/jpeg" };
}

/** Load the photo to edit, making sure it belongs to the caller. */
async function loadSource(r: StageRequest, userId: string, admin: SupabaseClient, supabaseUrl: string): Promise<Source | Outcome> {
  if (r.parentId) {
    const { data: parent } = await admin.from("stagings").select("*").eq("id", r.parentId).maybeSingle();
    if (!parent || parent.user_id !== userId) return fail(404, "That staging could not be found.", "parent_not_found");
    // Refines start from the clean master so labels and watermarks never stack.
    const file = parent.master_path
      ? await download(admin, MASTER_BUCKET, parent.master_path as string)
      : await download(admin, PUBLIC_BUCKET, ownedStoragePath(parent.staged_image_url as string, supabaseUrl, userId) ?? "");
    return { image: await sourceFrom(file.bytes, file.mime), originalUrl: parent.original_image_url as string, parent };
  }

  if (r.originalUrl) {
    const path = ownedStoragePath(r.originalUrl, supabaseUrl, userId);
    if (!path) return fail(403, "That photo isn't in your account.", "foreign_original");
    const file = await download(admin, PUBLIC_BUCKET, path);
    return { image: await sourceFrom(file.bytes, file.mime), originalUrl: r.originalUrl, parent: null };
  }

  // Legacy clients send the photo inline; store it so the staging has an original.
  const { bytes, mime } = dataUrlToBytes(r.imageData ?? "");
  if (bytes.length === 0) return fail(400, "Please upload an image to stage", "empty_image");
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const path = `${userId}/${crypto.randomUUID()}/original.${ext}`;
  const { error } = await admin.storage.from(PUBLIC_BUCKET).upload(path, bytes, { contentType: mime });
  if (error) throw new Error(`original_upload_failed: ${error.message}`);
  const originalUrl = admin.storage.from(PUBLIC_BUCKET).getPublicUrl(path).data.publicUrl;
  return { image: await sourceFrom(bytes, mime), originalUrl, parent: null };
}

/** Reserve up to `want` credits; returns how many were granted and the first refusal. */
async function reserveCredits(client: SupabaseClient, userId: string, want: number) {
  let granted = 0;
  let refusal: string | null = null;
  for (let i = 0; i < want; i++) {
    let { data, error } = await client.rpc("reserve_staging");
    // reserve_staging() may not exist yet if this deploys before its migration.
    if (error?.code === "PGRST202") {
      const legacy = await client.rpc("check_and_increment_staging", { p_user_id: userId });
      error = legacy.error;
      data = legacy.data === true ? "ok" : "quota_exceeded";
    }
    if (error) throw new Error(`quota_rpc: ${error.message}`);
    if (data !== "ok") {
      refusal = String(data);
      break;
    }
    granted++;
  }
  return { granted, refusal };
}

function chainFor(plan: string, override: string | null): string[] {
  const base = plan === "free" ? FAST_CHAIN : DEFAULT_CHAIN;
  const fromEnv = (Deno.env.get("STAGING_MODELS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const chain = fromEnv.length > 0 && plan !== "free" ? fromEnv : base;
  if (override && KNOWN_MODELS.includes(override)) return [override, ...chain.filter((m) => m !== override)];
  return chain;
}

interface SaveCtx {
  r: StageRequest;
  userId: string;
  admin: SupabaseClient;
  source: Source;
  isFree: boolean;
  model: string;
}

/** Store the clean master privately, the finished JPEG publicly, and the row. */
async function saveImage(image: GeneratedImage, c: SaveCtx): Promise<Record<string, unknown>> {
  const { r, userId, admin, source } = c;
  const id = crypto.randomUUID();
  const finished = await finishImage(image, { watermark: c.isFree, mlsLabel: r.wantsMlsLabel });

  const masterPath = `${userId}/${id}.${image.mime.includes("png") ? "png" : "jpg"}`;
  const stagedPath = `${userId}/${id}/staged.jpg`;
  const [m, s] = await Promise.all([
    admin.storage.from(MASTER_BUCKET).upload(masterPath, image.bytes, { contentType: image.mime }),
    admin.storage.from(PUBLIC_BUCKET).upload(stagedPath, finished, { contentType: "image/jpeg" }),
  ]);
  if (s.error) throw new Error(`staged_upload_failed: ${s.error.message}`);
  if (m.error) console.error("master upload failed:", m.error);

  const parent = source.parent;
  const { data: row, error } = await admin
    .from("stagings")
    .insert({
      id,
      user_id: userId,
      original_image_url: source.originalUrl,
      staged_image_url: admin.storage.from(PUBLIC_BUCKET).getPublicUrl(stagedPath).data.publicUrl,
      room_type: r.roomType,
      style: r.mode === "refine" ? `${r.style} (refined)` : r.mode === "remove" ? "Removed" : r.style,
      property_address: r.propertyName || (parent?.property_address as string | null) || null,
      custom_instructions: r.mode === "refine" ? r.refineInstruction : r.customInstructions || null,
      aspect_ratio: r.aspectRatio,
      mls_disclosure: r.wantsMlsLabel,
      staging_palette: r.palette || null,
      parent_id: parent ? parent.id : null,
      master_path: m.error ? null : masterPath,
      model: c.model,
      kind: r.mode,
    })
    .select("*")
    .single();
  if (error) throw new Error(`staging_insert_failed: ${error.message}`);
  return row;
}

async function handle(req: Request, ctx: Ctx, admin: SupabaseClient): Promise<Outcome> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return fail(401, "No authorization header", "no_auth");

  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return fail(401, "Unauthorized", "unauthorized");
  ctx.userId = user.id;

  // Validate everything before reserving a credit.
  const body = await req.json().catch(() => null);
  const parsed = parseStageBody(body);
  if (!parsed.ok) return fail(400, parsed.message, parsed.code);
  const r = parsed.value;
  ctx.request = r;

  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return fail(500, "Staging service is not configured. Please contact support.", "missing_api_key");

  const { data: usageRow } = await userClient.from("usage").select("*").eq("user_id", user.id).maybeSingle();
  const isAdmin = usageRow?.is_admin === true;
  const plan = isAdmin ? "admin" : ((usageRow?.plan as string | undefined) ?? "free");
  ctx.plan = plan;
  const isFree = plan === "free";

  const source = await loadSource(r, user.id, admin, supabaseUrl);
  if ("response" in source) return source;

  const { granted, refusal } = await reserveCredits(userClient, user.id, r.variations);
  ctx.reserved = granted;
  if (granted === 0) {
    const { status, message } = reserveFailure(refusal ?? "no_usage", plan);
    return fail(status, message, refusal ?? "no_usage");
  }

  const prompt = buildPrompt({
    mode: r.mode,
    roomType: r.roomType,
    style: r.style,
    customInstructions: r.customInstructions,
    refineInstruction: r.refineInstruction,
    palette: r.palette,
  });

  let generated;
  try {
    generated = await generateWithFallback(chainFor(plan, isAdmin ? r.model : null), {
      apiKey,
      prompt,
      image: source.image,
      aspectRatio: r.mode === "refine" ? null : r.aspectRatio,
      n: granted,
      hd: !isFree,
    });
  } catch (err) {
    console.error("generation failed:", err);
    if (err instanceof GatewayError && err.status === 429) {
      return fail(429, "Staging is busy right now. Please try again in a moment.", err.message);
    }
    if (err instanceof GatewayError && err.status === 402) {
      return fail(503, "Staging is temporarily unavailable. Please try again shortly.", err.message);
    }
    return fail(502, GENERIC_ERROR, err instanceof Error ? err.message : String(err));
  }
  ctx.model = generated.model;
  if (generated.attempts.length > 0) console.warn("model fallbacks:", generated.attempts);

  const rows: Record<string, unknown>[] = [];
  let lastError: unknown = null;
  for (const image of generated.images.slice(0, granted)) {
    try {
      rows.push(await saveImage(image, { r, userId: user.id, admin, source, isFree, model: generated.model }));
      ctx.used++;
    } catch (err) {
      // One bad variation shouldn't sink the others; its credit is refunded.
      console.error("saving image failed:", err);
      lastError = err;
    }
  }
  if (rows.length === 0) throw lastError ?? new Error("no_images_saved");

  return {
    response: json(200, {
      stagings: rows,
      stagedImageUrl: rows[0]?.staged_image_url,
      plan,
      model: generated.model,
      isWatermarked: isFree,
      mlsDisclosure: r.wantsMlsLabel,
    }),
    success: true,
    error: null,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const ctx: Ctx = { userId: null, plan: null, request: null, reserved: 0, used: 0, model: null };

  let outcome: Outcome;
  try {
    outcome = await handle(req, ctx, admin);
  } catch (err) {
    console.error("Stage room error:", err);
    outcome = fail(500, GENERIC_ERROR, `unhandled: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Every reserved credit that didn't become a saved image goes back.
  const unused = ctx.reserved - ctx.used;
  if (unused > 0 && ctx.userId) {
    for (let i = 0; i < unused; i++) {
      const { error } = await admin.rpc("decrement_staging", { p_user_id: ctx.userId });
      if (error) console.error("decrement_staging failed:", error);
    }
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
      model: ctx.model,
    })
    .then(({ error }) => {
      if (error) console.error("generation_logs insert failed:", error);
    });

  return outcome.response;
});
