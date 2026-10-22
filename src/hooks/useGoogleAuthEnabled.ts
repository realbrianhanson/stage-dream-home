import { useEffect, useState } from "react";

/**
 * Whether Google sign-in is turned on for this backend. Auth's public
 * settings endpoint lists enabled providers, so the button only shows when
 * it will actually work (it's off by default in new projects and remixes).
 */
export function useGoogleAuthEnabled(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;
    let cancelled = false;
    fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (!cancelled) setEnabled(s?.external?.google === true);
      })
      .catch(() => {
        // Leave it hidden; email sign-in still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}
