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

async function applyWatermark(sourceUrl: string): Promise<string> {
  const res = await fetch(sourceUrl);
  if (!res.ok) throw new Error("Failed to fetch generated image for watermarking");
  const bytes = new Uint8Array(await res.arrayBuffer());
  const img = await decode(bytes);
  if (!(img instanceof Image)) throw new Error("Unsupported image format");

  const font = await loadFont();
  if (!font) {
    // Font unavailable — draw a solid pill in the corner so free files are still marked.
    const barH = Math.max(28, Math.round(img.height * 0.04));
    const bar = new Image(img.width, barH).fill(0x000000aa);
    img.composite(bar, 0, img.height - barH);
  } else {
    const fontSize = Math.max(22, Math.round(img.width * 0.028));
    const text = "Staged by RealVision";
    const textImg = Image.renderText(font, fontSize, text, 0xffffffcc);
    const padX = Math.round(img.width * 0.02);
    const padY = Math.round(img.height * 0.02);
    const x = Math.max(0, img.width - textImg.width - padX);
    const y = Math.max(0, img.height - textImg.height - padY);
    // Soft shadow for legibility
    const shadow = Image.renderText(font, fontSize, text, 0x00000099);
    img.composite(shadow, x + 2, y + 2);
    img.composite(textImg, x, y);
  }

  const out = await img.encode(); // PNG
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

  try {
    // Auth verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // Per-user rate limit (10/min)
    if (!checkRateLimit(userId)) {
      return new Response(
        JSON.stringify({ error: "You're staging too fast. Please wait a minute before trying again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query user's plan (for watermark decision)
    const { data: usageData } = await supabaseClient
      .from("usage")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    const userPlan = usageData?.plan || "free";

    // Reserve a staging slot atomically. If AI generation fails below, we decrement.
    const { data: allowed, error: quotaError } = await supabaseClient.rpc(
      "check_and_increment_staging",
      { p_user_id: userId }
    );
    if (quotaError) {
      console.error("Quota RPC error:", quotaError);
      return new Response(
        JSON.stringify({ error: "Could not verify staging quota. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (allowed !== true) {
      return new Response(
        JSON.stringify({ error: "You've reached your free staging limit this month. Upgrade for unlimited stagings." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // From here on, any failure MUST decrement the reserved slot.
    const releaseSlot = async () => {
      try {
        await supabaseClient.rpc("decrement_staging" as any);
      } catch (e) {
        console.error("decrement_staging failed:", e);
      }
    };

    const { image, roomType, style, customInstructions, aspectRatio, mode } = await req.json();

    if (!image) {
      await releaseSlot();
      return new Response(
        JSON.stringify({ error: "Please upload an image to stage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await releaseSlot();
      return new Response(
        JSON.stringify({ error: "Staging service is not configured. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize custom instructions
    const sanitizedInstructions = typeof customInstructions === "string"
      ? customInstructions.slice(0, 300).trim()
      : "";

    const isRemoval = mode === "remove";
    const safeRoomType = (roomType || "room").toString().toLowerCase();
    const safeStyle = (style || "Modern").toString().toLowerCase();

    let prompt: string;

    if (isRemoval) {
      prompt = `You are a professional virtual de-staging specialist. Take this photo of a furnished ${safeRoomType} and digitally remove ALL furniture, decor, rugs, artwork, plants, lamps, curtains, and personal items.

The result must show a completely empty, vacant ${safeRoomType} with only the bare architecture remaining: walls, floors, ceiling, windows, doors, and built-in fixtures (kitchen counters, bathroom fixtures, fireplaces, built-in shelving). Patch and reconstruct any areas where furniture was hiding the floor or walls so they look natural, clean, and continuous.

CRITICAL: Keep the room's architecture, walls, windows, flooring material, ceiling, and lighting EXACTLY the same. Do not add anything new. Do not change wall colors. Do not stage. The output must be photorealistic, evenly lit, and indistinguishable from a real photograph of an empty room.`;
    } else {
      prompt = `You are a professional interior designer and virtual stager. Take this photo of an empty/vacant ${safeRoomType} and virtually stage it with beautiful ${safeStyle} style furniture and decor.

Add appropriate furniture like sofas, tables, chairs, rugs, lamps, artwork, plants, and decorative accessories. Make the room look warm, inviting, and ready for a real estate listing. Keep the room's architecture, walls, windows, and flooring exactly the same. Only add furniture and decor. Make it look photorealistic and professionally staged.`;
    }

    if (sanitizedInstructions) {
      prompt += `\n\nAdditional requirements from the client: ${sanitizedInstructions}`;
    }

    const validRatios = ["16:9", "4:3", "3:4", "1:1"];
    const sanitizedAspectRatio = typeof aspectRatio === "string" && validRatios.includes(aspectRatio) ? aspectRatio : null;

    if (sanitizedAspectRatio) {
      prompt += `\n\nIMPORTANT: Generate the image with a ${sanitizedAspectRatio} aspect ratio.`;
    }

    let response: Response;
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
      return new Response(
        JSON.stringify({ error: "Something went wrong staging your room. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      await releaseSlot();
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "You're staging too fast! Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Staging credits exhausted. Please upgrade your plan." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Something went wrong staging your room. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseData = await response.json();
    let stagedImageUrl: string | undefined =
      responseData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!stagedImageUrl) {
      await releaseSlot();
      return new Response(
        JSON.stringify({ error: "Something went wrong staging your room. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enforce watermark server-side for free plan so clients never receive a clean file.
    if (userPlan === "free") {
      try {
        stagedImageUrl = await applyWatermark(stagedImageUrl);
      } catch (wmErr) {
        console.error("Watermarking failed:", wmErr);
        // Better to fail than deliver a clean file to a free user.
        await releaseSlot();
        return new Response(
          JSON.stringify({ error: "Failed to finalize your image. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ stagedImageUrl, plan: userPlan, isWatermarked: userPlan === "free" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Stage room error:", error);
    return new Response(
      JSON.stringify({ error: "Something went wrong staging your room. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
