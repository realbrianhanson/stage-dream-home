import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


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

    const { image, roomType, style, customInstructions, aspectRatio, mode } = await req.json();

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
