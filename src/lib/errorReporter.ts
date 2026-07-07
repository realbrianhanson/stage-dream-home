import { supabase } from "@/integrations/supabase/client";

const MAX_PER_SESSION = 5;
let sentThisSession = 0;

export async function reportClientError(input: {
  message: string;
  stack?: string | null;
  path?: string;
}) {
  try {
    if (sentThisSession >= MAX_PER_SESSION) return;

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id ?? null;
    // Only authenticated users can insert (per RLS); silently skip otherwise.
    if (!userId) return;

    sentThisSession += 1;

    const path =
      input.path ??
      (typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : null);

    await supabase.from("client_errors").insert({
      user_id: userId,
      path,
      message: (input.message || "").slice(0, 2000),
      stack: input.stack ? String(input.stack).slice(0, 2000) : null,
    });
  } catch {
    // Never let error reporting break the app.
  }
}
