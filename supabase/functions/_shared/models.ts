// Image-model calls through the Lovable AI gateway, with a fallback chain so a
// retired or misbehaving model degrades to the next one instead of failing.
import { gptImageSize, geminiAspect } from "./sizing.ts";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export interface SourceImage {
  bytes: Uint8Array;
  mime: string;
  width: number;
  height: number;
}

export interface GenerateArgs {
  apiKey: string;
  prompt: string;
  image: SourceImage;
  aspectRatio?: string | null;
  n: number;
  hd: boolean;
  signal?: AbortSignal;
}

export interface GeneratedImage {
  bytes: Uint8Array;
  mime: string;
}

export interface Generated {
  images: GeneratedImage[];
  model: string;
}

export class GatewayError extends Error {
  constructor(public status: number, public detail: string) {
    super(`gateway_${status}: ${detail.slice(0, 500)}`);
  }
  /** Rate limits and exhausted credits won't improve on another model. */
  get final() {
    return this.status === 429 || this.status === 402;
  }
}

// Best editing quality first (Artificial Analysis image-editing leaderboard,
// Oct 2026), then Google's models, then the old model while it still exists.
export const DEFAULT_CHAIN = [
  "openai/gpt-image-2.5-sunburst",
  "google/gemini-3-pro-image",
  "google/gemini-2.5-flash-image",
];
export const FAST_CHAIN = [
  "openai/gpt-image-2.5-flare",
  "google/gemini-3-pro-image",
  "google/gemini-2.5-flash-image",
];
export const KNOWN_MODELS = [...new Set([...DEFAULT_CHAIN, ...FAST_CHAIN, "openai/gpt-image-2"])];

const isGpt = (model: string) => model.startsWith("openai/");

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

async function fromUrlOrB64(item: { b64_json?: string; url?: string }): Promise<GeneratedImage> {
  if (item.b64_json) return { bytes: b64ToBytes(item.b64_json), mime: "image/jpeg" };
  if (item.url?.startsWith("data:")) {
    const [head, b64] = item.url.split(",");
    return { bytes: b64ToBytes(b64), mime: head.match(/:(.*?);/)?.[1] ?? "image/png" };
  }
  if (item.url) {
    const r = await fetch(item.url);
    if (!r.ok) throw new GatewayError(502, "image_url_fetch_failed");
    return { bytes: new Uint8Array(await r.arrayBuffer()), mime: r.headers.get("content-type") ?? "image/png" };
  }
  throw new GatewayError(502, "no_image_in_response");
}

async function gptEdit(model: string, a: GenerateArgs): Promise<GeneratedImage[]> {
  const form = new FormData();
  form.append("model", model);
  form.append("prompt", a.prompt);
  const ext = a.image.mime.includes("png") ? "png" : a.image.mime.includes("webp") ? "webp" : "jpg";
  form.append("image", new File([new Uint8Array(a.image.bytes)], `room.${ext}`, { type: a.image.mime }));
  form.append("size", gptImageSize(a.image.width, a.image.height, a.aspectRatio, a.hd ? 2048 : 1536));
  form.append("quality", a.hd ? "high" : "medium");
  form.append("output_format", "jpeg");
  form.append("n", String(a.n));
  const r = await fetch(`${GATEWAY}/images/edits`, {
    method: "POST",
    headers: { Authorization: `Bearer ${a.apiKey}` },
    body: form,
    signal: a.signal,
  });
  if (!r.ok) throw new GatewayError(r.status, await r.text().catch(() => ""));
  const json = await r.json();
  const data: Array<{ b64_json?: string; url?: string }> = json?.data ?? [];
  if (data.length === 0) throw new GatewayError(502, "no_image_in_response");
  return Promise.all(data.map(fromUrlOrB64));
}

async function geminiOnce(model: string, a: GenerateArgs, withConfig: boolean): Promise<GeneratedImage> {
  const dataUrl = `data:${a.image.mime};base64,${bytesToB64(a.image.bytes)}`;
  const r = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${a.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: a.prompt },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      modalities: ["image", "text"],
      ...(withConfig
        ? {
            image_config: {
              aspect_ratio: geminiAspect(a.image.width, a.image.height, a.aspectRatio),
              image_size: a.hd ? "2K" : "1K",
            },
          }
        : {}),
    }),
    signal: a.signal,
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    // Not every gateway route knows image_config; retry plain once.
    if (withConfig && r.status === 400 && /image_config|aspect|image_size/i.test(detail)) {
      return geminiOnce(model, a, false);
    }
    throw new GatewayError(r.status, detail);
  }
  const json = await r.json();
  const url: string | undefined = json?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new GatewayError(502, "no_image_in_response");
  return fromUrlOrB64({ url });
}

async function geminiEdit(model: string, a: GenerateArgs): Promise<GeneratedImage[]> {
  const withConfig = !model.includes("2.5-flash");
  return Promise.all(Array.from({ length: a.n }, () => geminiOnce(model, a, withConfig)));
}

// Edge functions get ~150s of wall clock. Leave room for saving the result.
const TOTAL_BUDGET_MS = 135_000;
const PER_MODEL_MS = 100_000;
const MIN_ATTEMPT_MS = 20_000;

/** Try each model in turn until one returns images, within the time budget. */
export async function generateWithFallback(chain: string[], a: GenerateArgs): Promise<Generated & { attempts: string[] }> {
  const attempts: string[] = [];
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let last: unknown = null;
  for (const model of chain) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;
    try {
      const signal = AbortSignal.timeout(Math.min(PER_MODEL_MS, remaining));
      const args = { ...a, signal };
      const images = isGpt(model) ? await gptEdit(model, args) : await geminiEdit(model, args);
      return { images, model, attempts };
    } catch (err) {
      last = err;
      attempts.push(`${model}: ${err instanceof Error ? err.message.slice(0, 200) : String(err)}`);
      if (err instanceof GatewayError && err.final) throw err;
    }
  }
  throw last ?? new GatewayError(502, "no_models");
}
