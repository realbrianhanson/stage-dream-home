import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image, decode } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

// --- Simple in-memory per-user rate limit (10 requests / 60s) ---
const RL_WINDOW_MS = 60_000;
const RL_MAX = 10;
const rateLimitLog = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const arr = (rateLimitLog.get(userId) || []).filter((t) => now - t < RL_WINDOW_MS);
  if (arr.length >= RL_MAX) {
    rateLimitLog.set(userId, arr);
    return false;
  }
  arr.push(now);
  rateLimitLog.set(userId, arr);
  return true;
}

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

function paintMlsLabel(img: Image, font: Uint8Array | null) {
  if (!font) {
    // Font unavailable — draw a subtle pill bottom-left as fallback.
    const barW = Math.max(120, Math.round(img.width * 0.22));
    const barH = Math.max(24, Math.round(img.height * 0.035));
    const bar = new Image(barW, barH).fill(0x00000099);
    img.composite(bar, 0, img.height - barH);
    return;
  }
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
    if (opts.mlsLabel) paintMlsLabel(img, font);
    if (opts.watermark) paintWatermark(img, font);
  }

  const out = await img.encode();
  return `data:image/png;base64,${bytesToBase64(out)}`;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();
  let logUserId: string | null = null;
  let logKind: "stage" | "remove" | "refine" = "stage";
  let logRoomType: string | null = null;
  let logStyle: string | null = null;
  let logPlan: string | null = null;
  let logMlsDisclosure = false;
  let logAdminClient: ReturnType<typeof createClient> | null = null;

  const writeLog = async (success: boolean, errorText: string | null) => {
    try {
      const client =
        logAdminClient ??
        createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
      await client.from("generation_logs" as any).insert({
        user_id: logUserId,
        kind: logKind,
        room_type: logRoomType,
        style: logStyle,
        plan: logPlan,
        success,
        error_text: errorText ? errorText.slice(0, 2000) : null,
        duration_ms: Date.now() - startedAt,
        mls_disclosure: logMlsDisclosure,
      });
    } catch (e) {
      console.error("generation_logs insert failed:", e);
    }
  };

  let finalResponse: Response;
  let finalSuccess = false;
  let finalError: string | null = null;

  try {
    // Auth verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      finalError = "No authorization header";
      finalResponse = new Response(
        JSON.stringify({ error: finalError }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !user) {
        finalError = "Unauthorized";
        finalResponse = new Response(
          JSON.stringify({ error: finalError }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const userId = user.id;
        logUserId = userId;

        // Per-user rate limit (10/min)
        if (!checkRateLimit(userId)) {
          finalError = "rate_limited";
          finalResponse = new Response(
            JSON.stringify({ error: "You're staging too fast. Please wait a minute before trying again." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Query user's plan (for watermark decision)
          const { data: usageData } = await supabaseClient
            .from("usage")
            .select("plan")
            .eq("user_id", userId)
            .maybeSingle();

          const userPlan = usageData?.plan || "free";
          logPlan = userPlan;

          // Reserve a staging slot atomically. If AI generation fails below, we decrement.
          const { data: allowed, error: quotaError } = await supabaseClient.rpc(
            "check_and_increment_staging",
            { p_user_id: userId }
          );
          if (quotaError) {
            console.error("Quota RPC error:", quotaError);
            finalError = `quota_rpc: ${quotaError.message}`;
            finalResponse = new Response(
              JSON.stringify({ error: "Could not verify staging quota. Please try again." }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else if (allowed !== true) {
            finalError = "quota_exceeded";
            finalResponse = new Response(
              JSON.stringify({ error: "You've reached your free staging limit this month. Upgrade for unlimited stagings." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } else {
            // From here on, any failure MUST decrement the reserved slot.
            const adminClient = createClient(
              Deno.env.get("SUPABASE_URL")!,
              Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
            );
            logAdminClient = adminClient;
            const releaseSlot = async () => {
              try {
                await adminClient.rpc("decrement_staging" as any, { p_user_id: userId });
              } catch (e) {
                console.error("decrement_staging failed:", e);
              }
            };

            const { image, roomType, style, customInstructions, aspectRatio, mode, mls_disclosure, refineInstruction, palette } = await req.json();
            const wantsMlsLabel = mls_disclosure === true && mode !== "remove";
            const sanitizedPalette = typeof palette === "string" ? palette.slice(0, 200).trim() : "";

            logKind = mode === "remove" ? "remove" : mode === "refine" ? "refine" : "stage";
            logRoomType = typeof roomType === "string" ? roomType.slice(0, 80) : null;
            logStyle = typeof style === "string" ? style.slice(0, 80) : null;
            logMlsDisclosure = wantsMlsLabel;

            if (!image) {
              await releaseSlot();
              finalError = "no_image";
              finalResponse = new Response(
                JSON.stringify({ error: "Please upload an image to stage" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            } else {
              const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
              if (!LOVABLE_API_KEY) {
                await releaseSlot();
                finalError = "missing_api_key";
                finalResponse = new Response(
                  JSON.stringify({ error: "Staging service is not configured. Please contact support." }),
                  { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              } else {
                // Sanitize custom instructions
                const sanitizedInstructions = typeof customInstructions === "string"
                  ? customInstructions.slice(0, 300).trim()
                  : "";

                const sanitizedRefine = typeof refineInstruction === "string"
                  ? refineInstruction.slice(0, 240).trim()
                  : "";

                const isRemoval = mode === "remove";
                const isRefine = mode === "refine";
                const normalizeRoomType = (raw: string) => {
                  const lower = raw.toLowerCase().trim();
                  const map: Record<string, string> = {
                    "outdoor / patio": "outdoor patio space",
                    "outdoor/patio": "outdoor patio space",
                    "home office": "home office",
                    "home gym": "home gym",
                    "dining room": "dining room",
                    "living room": "living room",
                    "nursery": "nursery",
                    "basement": "basement",
                  };
                  return map[lower] ?? lower.replace(/\s*\/\s*/g, " ").replace(/\s+/g, " ");
                };
                const safeRoomType = normalizeRoomType((roomType || "room").toString());
                const safeStyle = (style || "Modern").toString().toLowerCase();

                let prompt: string;
                let skipGeneration = false;

                if (isRefine) {
                  if (!sanitizedRefine) {
                    await releaseSlot();
                    finalError = "empty_refine";
                    finalResponse = new Response(
                      JSON.stringify({ error: "Please describe what to change." }),
                      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                    skipGeneration = true;
                    prompt = "";
                  } else {
                    prompt = `You are refining a virtually staged real estate photo. Take this image and apply ONLY the following change requested by the client: "${sanitizedRefine}".

CRITICAL RULES — the output MUST match the input image in every way EXCEPT the requested change:
- Keep the EXACT same room, architecture, walls, windows, doors, flooring, ceiling and built-in fixtures.
- Keep the EXACT same camera angle, framing, perspective, focal length and lighting direction.
- Keep the overall staging composition, style and materials the same. Do NOT re-stage from scratch.
- Do NOT modify furniture or decor that the instruction does not explicitly touch.
- Only modify what the instruction specifies.

The result must be photorealistic and indistinguishable from a real photograph of a ${safeRoomType}, matching the ${safeStyle} style of the input.`;
                  }
                } else if (isRemoval) {
                  prompt = `You are a professional virtual de-staging specialist. Take this photo of a furnished ${safeRoomType} and digitally remove ALL furniture, decor, rugs, artwork, plants, lamps, curtains, and personal items.

The result must show a completely empty, vacant ${safeRoomType} with only the bare architecture remaining: walls, floors, ceiling, windows, doors, and built-in fixtures (kitchen counters, bathroom fixtures, fireplaces, built-in shelving). Patch and reconstruct any areas where furniture was hiding the floor or walls so they look natural, clean, and continuous.

CRITICAL: Keep the room's architecture, walls, windows, flooring material, ceiling, and lighting EXACTLY the same. Do not add anything new. Do not change wall colors. Do not stage. The output must be photorealistic, evenly lit, and indistinguishable from a real photograph of an empty room.`;
                } else {
                  prompt = `You are a professional interior designer and virtual stager. Take this photo of an empty/vacant ${safeRoomType} and virtually stage it with beautiful ${safeStyle} style furniture and decor.

Add appropriate furniture like sofas, tables, chairs, rugs, lamps, artwork, plants, and decorative accessories. Make the room look warm, inviting, and ready for a real estate listing. Keep the room's architecture, walls, windows, and flooring exactly the same. Only add furniture and decor. Make it look photorealistic and professionally staged.`;
                }

                if (!skipGeneration) {
                  if (sanitizedInstructions && !isRefine) {
                    prompt += `\n\nAdditional requirements from the client: ${sanitizedInstructions}`;
                  }

                  if (sanitizedPalette && !isRemoval) {
                    prompt += `\n\nThis room is part of a whole-home staging. Use a consistent furniture collection and palette across rooms: ${sanitizedPalette}. Keep the same design language, wood tones, metal finishes, and textile palette so all rooms in this listing feel professionally coordinated.`;
                  }

                  const validRatios = ["16:9", "4:3", "3:4", "1:1"];
                  const sanitizedAspectRatio = typeof aspectRatio === "string" && validRatios.includes(aspectRatio) ? aspectRatio : null;

                  if (sanitizedAspectRatio && !isRefine) {
                    prompt += `\n\nIMPORTANT: Generate the image with a ${sanitizedAspectRatio} aspect ratio.`;
                  }

                  let response: Response;
                  let fetchFailed = false;
                  try {
                    response = await fetch(
                      "https://ai.gateway.lovable.dev/v1/chat/completions",
                      {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${LOVABLE_API_KEY}`,
                          "Content-Type": "application/json",
                        },
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
                      }
                    );
                  } catch (fetchErr) {
                    console.error("AI gateway fetch failed:", fetchErr);
                    await releaseSlot();
                    finalError = `gateway_fetch: ${(fetchErr as Error)?.message || "unknown"}`;
                    finalResponse = new Response(
                      JSON.stringify({ error: "Something went wrong staging your room. Please try again." }),
                      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                    fetchFailed = true;
                    response = new Response();
                  }

                  if (!fetchFailed) {
                    if (!response.ok) {
                      await releaseSlot();
                      if (response.status === 429) {
                        finalError = "gateway_429";
                        finalResponse = new Response(
                          JSON.stringify({ error: "You're staging too fast! Please wait a moment and try again." }),
                          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                        );
                      } else if (response.status === 402) {
                        finalError = "gateway_402";
                        finalResponse = new Response(
                          JSON.stringify({ error: "Staging credits exhausted. Please upgrade your plan." }),
                          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                        );
                      } else {
                        const errorText = await response.text();
                        console.error("AI gateway error:", response.status, errorText);
                        finalError = `gateway_${response.status}: ${errorText}`;
                        finalResponse = new Response(
                          JSON.stringify({ error: "Something went wrong staging your room. Please try again." }),
                          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                        );
                      }
                    } else {
                      const responseData = await response.json();
                      let stagedImageUrl: string | undefined =
                        responseData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

                      if (!stagedImageUrl) {
                        await releaseSlot();
                        finalError = "no_staged_url";
                        finalResponse = new Response(
                          JSON.stringify({ error: "Something went wrong staging your room. Please try again." }),
                          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                        );
                      } else {
                        // Postprocess: upscale + watermarks
                        const isFree = userPlan === "free";
                        let postprocessFailedForFree = false;
                        try {
                          stagedImageUrl = await postprocessImage(stagedImageUrl, {
                            watermark: isFree,
                            mlsLabel: wantsMlsLabel,
                            upscale: !isFree,
                          });
                        } catch (ppErr) {
                          console.error("Postprocess failed:", ppErr);
                          if (isFree) {
                            await releaseSlot();
                            finalError = `postprocess: ${(ppErr as Error)?.message || "unknown"}`;
                            finalResponse = new Response(
                              JSON.stringify({ error: "Failed to finalize your image. Please try again." }),
                              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                            );
                            postprocessFailedForFree = true;
                          }
                        }

                        if (!postprocessFailedForFree) {
                          finalSuccess = true;
                          finalResponse = new Response(
                            JSON.stringify({
                              stagedImageUrl,
                              plan: userPlan,
                              isWatermarked: isFree,
                              mlsDisclosure: wantsMlsLabel,
                            }),
                            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                          );
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (!finalResponse!) {
      finalError = finalError ?? "unknown_flow";
      finalResponse = new Response(
        JSON.stringify({ error: "Something went wrong staging your room. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Stage room error:", error);
    finalError = `unhandled: ${(error as Error)?.message || "unknown"}`;
    finalResponse = new Response(
      JSON.stringify({ error: "Something went wrong staging your room. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Fire-and-forget log; never blocks or breaks the response.
  writeLog(finalSuccess, finalError).catch((e) => console.error("writeLog error:", e));

  return finalResponse!;
});
