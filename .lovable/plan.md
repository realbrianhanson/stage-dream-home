

# Code Review — RealVision

## Summary
The codebase is well-structured overall. Below are the issues I found, grouped by severity.

---

## Critical / Security

1. **`as any` casts on database inserts** (RoomUploader.tsx lines 197-207, 254-264; OnboardingOverlay.tsx line 29) — These bypass type safety. The root cause is likely that the generated Supabase types are stale. Regenerating types would let you remove these casts and catch schema mismatches at build time.

2. **No storage cleanup on staging delete** (Gallery.tsx line 55) — `handleDelete` deletes the DB row but leaves the original and staged images in the `stagings` storage bucket. Over time this becomes orphaned data and a cost leak. Should delete from storage first, then the row.

3. **`check_and_increment_staging` RPC is callable by any authenticated user for any user_id** — The RPC takes `p_user_id` as a parameter and runs as `SECURITY DEFINER`. A malicious user could call it with someone else's user_id to burn their staging credits. It should use `auth.uid()` internally instead of accepting a parameter.

4. **Forgot password button is a no-op** (Auth.tsx line 141) — The button exists but has no `onClick` handler. Either wire it to `supabase.auth.resetPasswordForEmail()` or remove it.

---

## Bugs / Correctness

5. **Auth race condition** (useAuth.tsx) — `getSession()` and `onAuthStateChange` both call `setLoading(false)`. If `getSession` resolves first with null (no session), `loading` becomes false before the auth state listener fires, causing a brief flash of the login redirect for authenticated users. Fix: only set loading to false inside the listener, and use `getSession` just to seed the initial state synchronously.

6. **`initialCustomInstructions` missing from useEffect deps** (RoomUploader.tsx line 110) — The effect that syncs initial values omits `initialCustomInstructions` from the dependency array.

7. **Multi-style uploads the original image N times** (RoomUploader.tsx lines 249-251) — For a 3-style comparison, the same original photo gets uploaded 3 times to 3 different staging folders. Should upload it once and reuse the URL.

8. **`canStage` goes stale during multi-style loop** — After `checkAndIncrement` updates `usage` state in useUsage, the `canStage` derived value in the parent won't re-render mid-loop. This is actually fine because the RPC is the source of truth, but the UI's `canStage` check at line 160 could be wrong after the first style completes. Minor, but worth noting.

---

## Performance

9. **Gallery fetches all stagings without pagination** — `select("*")` with no `.range()`. Will break at 1000 rows (Supabase default limit) and get slow well before that.

10. **Landing page loads 5 full-res images eagerly** — `heroImage` is imported as a module (always bundled). The showcase images use `loading="lazy"` which is good, but the hero and before/after images are ~2-5MB each depending on source. Consider using optimized/compressed versions.

11. **`DownloadWithPresets` creates a new `Image()` on every render** (line 123-128) — The `useEffect` that probes image dimensions runs on every `imageUrl` change, which is correct, but doesn't clean up the `img.onload` handler or revoke anything.

---

## Code Quality / DX

12. **Duplicate crop logic** — `cropAndResize` and `cropResizeAndWatermark` in DownloadWithPresets.tsx are ~90% identical. Extract the crop logic into a shared helper and optionally apply the watermark.

13. **`convertToPngBlob` in BeforeAfterSlider leaks an object URL** (line 80) — `URL.createObjectURL(blob)` is called but never revoked.

14. **Magic number `3` for free limit** — It's defined as `FREE_LIMIT = 3` in useUsage but also hardcoded in the SQL function `check_and_increment_staging`. If you change one, you'll forget the other.

15. **No error boundary** — Any unhandled React error in a child component crashes the whole app with a white screen. A top-level `ErrorBoundary` component would be a simple safety net.

16. **Landing page pricing doesn't match actual limits** — The pricing card says "2 design styles" for free tier, but the app allows selecting up to 3 styles in compare mode regardless of plan.

---

## Minor / Polish

17. **Footer links (Privacy, Terms, Contact) are all `href="#"`** on Landing.tsx — Dead links in production look unprofessional.

18. **`signOut` doesn't navigate** — After signing out, the user stays on `/app` or `/gallery` until the auth state change triggers the `ProtectedRoute` redirect. Could feel sluggish. Navigate to `/` immediately on signOut.

19. **No loading/error state for the gallery search** — If search returns no results, the "No properties matching" message appears, which is good. But there's no debounce on the search input.

20. **Onboarding overlay z-index (40) is below the nav (50)** — The nav bar peeks through on top of the onboarding modal.

---

## Recommended Priority

Tackle in this order:
1. Fix the `check_and_increment_staging` RPC to use `auth.uid()` (security)
2. Add storage cleanup on delete (data hygiene)
3. Fix the auth race condition (UX)
4. Upload original image once for multi-style (perf/cost)
5. Wire up forgot password or remove the button
6. Everything else as time permits

No code changes needed from me — this is informational only. Let me know if you'd like me to implement any of these fixes.

