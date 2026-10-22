// Looks at an uploaded photo and suggests the room type and the right tool
// (stage an empty room, declutter a furnished one, dusk/sky for exteriors).
// Free to call: it uses a cheap vision model and never takes a credit.
import { createClient } from "npm:@supabase/supabase-js@2";
import { ROOM_TYPES } from "../_shared/catalog.ts";
import { ownedStoragePath } from "../_shared/staging.ts";
import { parseDetection } from "../_shared/detect.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const MODEL = "google/gemini-3.1-flash-lite";

const PROMPT = `You are looking at one real estate listing photo. Reply with JSON only, no prose:
{"roomType": one of ${JSON.stringify(ROOM_TYPES)}, "exterior": true if this is an outside view of the home or yard, "furnished": "empty" | "partly" | "furnished", "sky": true if open sky is visible}`;

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json(401, { error: "Unauthorized" });

    const body = await req.json().catch(() => null);
    const path = typeof body?.originalUrl === "string" ? ownedStoragePath(body.originalUrl, supabaseUrl, user.id) : null;
    if (!path) return json(400, { error: "Upload the photo first." });

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json(500, { error: "Detection is not configured." });

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: file, error } = await admin.storage.from("stagings").download(path);
    if (error || !file) return json(404, { error: "Photo not found." });
    const bytes = new Uint8Array(await file.arrayBuffer());

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: `data:${file.type || "image/jpeg"};base64,${bytesToB64(bytes)}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!r.ok) {
      console.error("detect-room gateway error:", r.status, await r.text().catch(() => ""));
      return json(502, { error: "Couldn't analyze the photo." });
    }
    const data = await r.json();
    return json(200, parseDetection(data?.choices?.[0]?.message?.content));
  } catch (err) {
    console.error("detect-room error:", err);
    return json(500, { error: "Couldn't analyze the photo." });
  }
});
