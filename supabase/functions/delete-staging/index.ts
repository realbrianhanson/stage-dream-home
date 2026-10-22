// Deletes one of the caller's stagings and every file that belongs only to
// it: the finished image, the private clean master, and the original when no
// other staging still uses it. The browser can't reach the private bucket, so
// this has to run with the service role.
import { createClient } from "npm:@supabase/supabase-js@2";
import { ownedStoragePath } from "../_shared/staging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json(401, { error: "Please sign in again." });

    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" && UUID.test(body.id) ? body.id : null;
    if (!id) return json(400, { error: "Missing staging id." });

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: row } = await admin.from("stagings").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!row) return json(404, { error: "That photo is already gone." });

    // Row first: if this fails nothing is lost, and files are never orphaned
    // from a row that still points at them.
    const { error: deleteError } = await admin.from("stagings").delete().eq("id", id).eq("user_id", user.id);
    if (deleteError) {
      console.error("delete-staging row delete failed:", deleteError);
      return json(500, { error: "Couldn't delete the photo. Please try again." });
    }

    const publicFiles: string[] = [];
    const staged = ownedStoragePath(row.staged_image_url, supabaseUrl, user.id);
    if (staged) publicFiles.push(staged);
    const { count: siblings } = await admin
      .from("stagings")
      .select("id", { count: "exact", head: true })
      .eq("original_image_url", row.original_image_url);
    const original = ownedStoragePath(row.original_image_url, supabaseUrl, user.id);
    if (original && (siblings ?? 0) === 0) publicFiles.push(original);

    const master = typeof row.master_path === "string" && row.master_path.startsWith(`${user.id}/`) ? row.master_path : null;

    const [pub, priv] = await Promise.all([
      publicFiles.length ? admin.storage.from("stagings").remove(publicFiles) : Promise.resolve({ error: null }),
      master ? admin.storage.from("staging-masters").remove([master]) : Promise.resolve({ error: null }),
    ]);
    if (pub.error) console.error("delete-staging public cleanup failed:", pub.error);
    if (priv.error) console.error("delete-staging master cleanup failed:", priv.error);

    return json(200, { deleted: id });
  } catch (err) {
    console.error("delete-staging error:", err);
    return json(500, { error: "Couldn't delete the photo. Please try again." });
  }
});
