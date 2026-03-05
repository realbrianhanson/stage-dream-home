import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

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

    // Query user's plan
    const { data: usageData } = await supabaseClient
      .from("usage")
      .select("plan")
      .eq("user_id", userId)
      .maybeSingle();

    const userPlan = usageData?.plan || "free";

    const { image, roomType, style, customInstructions, aspectRatio } = await req.json();

    if (!image) {
      return new Response(
        JSON.stringify({ error: "Please upload an image to stage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Staging service is not configured. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sanitize custom instructions
    const sanitizedInstructions = typeof customInstructions === "string"
      ? customInstructions.slice(0, 300).trim()
      : "";

    let prompt = `You are a professional interior designer and virtual stager. Take this photo of an empty/vacant ${roomType.toLowerCase()} and virtually stage it with beautiful ${style.toLowerCase()} style furniture and decor. 

Add appropriate furniture like sofas, tables, chairs, rugs, lamps, artwork, plants, and decorative accessories. Make the room look warm, inviting, and ready for a real estate listing. Keep the room's architecture, walls, windows, and flooring exactly the same. Only add furniture and decor. Make it look photorealistic and professionally staged.`;

    if (sanitizedInstructions) {
      prompt += `\n\nAdditional staging requirements from the client: ${sanitizedInstructions}`;
    }

    const validRatios = ["16:9", "4:3", "3:4", "1:1"];
    const sanitizedAspectRatio = typeof aspectRatio === "string" && validRatios.includes(aspectRatio) ? aspectRatio : null;

    if (sanitizedAspectRatio) {
      prompt += `\n\nIMPORTANT: Generate the staged image with a ${sanitizedAspectRatio} aspect ratio.`;
    }

    const response = await fetch(
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
                {
                  type: "image_url",
                  image_url: { url: image },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      }
    );

    if (!response.ok) {
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
    const stagedImageUrl =
      responseData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!stagedImageUrl) {
      return new Response(
        JSON.stringify({ error: "Something went wrong staging your room. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let finalImageUrl = stagedImageUrl;

    // Server-side watermark for free plan users
    if (userPlan === "free") {
      try {
        // Extract base64 data from data URL
        const base64Match = stagedImageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (base64Match) {
          const base64Data = base64Match[2];
          const imageBytes = Uint8Array.from(atob(base64Data), (c: string) => c.charCodeAt(0));

          const img = await Image.decode(imageBytes);
          const w = img.width;
          const h = img.height;

          // 30% opacity white and shadow colors
          const wmColor = Image.rgbaToColor(255, 255, 255, 77);
          const shColor = Image.rgbaToColor(0, 0, 0, 38);

          const fontSize = Math.max(20, Math.floor(Math.min(w, h) / 18));
          const thickness = Math.max(2, Math.floor(fontSize / 8));

          // Draw "RV" watermark in a 3x3 grid across the image
          const stepX = Math.floor(w / 3);
          const stepY = Math.floor(h / 3);

          for (let gy = 0; gy < 3; gy++) {
            for (let gx = 0; gx < 3; gx++) {
              const cx = stepX * gx + Math.floor(stepX / 2);
              const cy = stepY * gy + Math.floor(stepY / 2);
              const bw = Math.floor(fontSize * 2.5);
              const bh = Math.floor(fontSize * 1.2);
              const sx = Math.max(0, cx - Math.floor(bw / 2));
              const sy = Math.max(0, cy - Math.floor(bh / 2));

              for (let y = sy; y < Math.min(h, sy + bh); y++) {
                for (let x = sx; x < Math.min(w, sx + bw); x++) {
                  const lx = x - sx;
                  const ly = y - sy;
                  const cw = Math.floor(bw / 5);
                  let draw = false;

                  // R letter
                  if (lx < cw * 2) {
                    if (lx < thickness) draw = true;
                    if (ly < thickness && lx < cw * 1.8) draw = true;
                    if (Math.abs(ly - bh / 2) < thickness / 2 && lx < cw * 1.8) draw = true;
                    if (lx >= cw * 1.8 - thickness && lx < cw * 1.8 && ly < bh / 2) draw = true;
                    if (ly >= bh / 2) {
                      const ex = thickness + (ly - bh / 2) * (cw * 1.5 / (bh / 2));
                      if (Math.abs(lx - ex) < thickness) draw = true;
                    }
                  }

                  // V letter
                  if (lx >= cw * 2.5 && lx < cw * 5) {
                    const vx = lx - cw * 2.5;
                    const vw = cw * 2.5;
                    if (Math.abs(vx - (ly / bh) * (vw / 2)) < thickness) draw = true;
                    if (Math.abs(vx - (vw - (ly / bh) * (vw / 2))) < thickness) draw = true;
                  }

                  if (draw) {
                    if (x + 1 < w && y + 1 < h) img.setPixelAt(x + 2, y + 2, shColor);
                    img.setPixelAt(x + 1, y + 1, wmColor);
                  }
                }
              }
            }
          }

          const encodedBytes = await img.encode();
          const uint8 = new Uint8Array(encodedBytes);
          let binary = "";
          for (let ci = 0; ci < uint8.length; ci++) {
            binary += String.fromCharCode(uint8[ci]);
          }
          const encodedBase64 = btoa(binary);
          finalImageUrl = `data:image/png;base64,${encodedBase64}`;
        }
      } catch (wmError) {
        console.error("Watermark error (returning unwatermarked):", wmError);
      }
    }

    return new Response(
      JSON.stringify({ stagedImageUrl: finalImageUrl, plan: userPlan, isWatermarked: userPlan === "free" }),
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
