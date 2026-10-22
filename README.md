# RealVision

AI virtual staging for real estate listings. Agents and photographers upload a listing photo and get back a finished image in about a minute:

- **Add furniture** to an empty room in 12 styles, with up to 4 options per photo or several styles side by side
- **Remove furniture** or **declutter** a furnished room
- **Recolor** walls, floors or cabinets to preview a renovation
- **Day to dusk**, **blue sky** and **refresh lawn** for exteriors
- **Refine** any result in plain words ("warmer rug, smaller sofa")
- **Download for MLS**: a zip of original + edited pairs with a disclosure note
- **Listing pages** and share links to send buyers

Built with Lovable (Vite, React, Tailwind, shadcn/ui) on Lovable Cloud (Postgres, Storage, Edge Functions). Images are generated through the Lovable AI gateway, so there's no image-model API key to set up.

## Remixing this project

1. **Remix it in Lovable.** Lovable Cloud creates a fresh database and storage for you.
2. **Sign up first.** The first account created in your copy becomes the **admin**: unlimited stagings, no watermark, and a model picker under "More options" in the studio. Everyone after that starts on the free plan. To make someone else an admin, run this in your database:
   ```sql
   update public.usage set is_admin = true
   where user_id = (select id from auth.users where email = 'person@example.com');
   ```
3. **Deploy the backend functions** if they aren't live: ask the Lovable agent to "deploy the edge functions stage-room, detect-room, stripe-webhook, create-checkout and customer-portal".
4. **Publish** from Lovable when you're ready. Pushing code to GitHub updates the editor but not your published site.

### Optional settings (Lovable → Cloud → Secrets)

| Secret | What it does |
| --- | --- |
| `STAGING_MODELS` | Comma-separated model chain for paid and admin runs, best first. Default: `openai/gpt-image-2.5-sunburst,google/gemini-3-pro-image,google/gemini-2.5-flash-image`. Free runs use the faster `gpt-image-2.5-flare` first. |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Turn on paid plans. Until they're set, upgrade buttons show "Billing is almost ready". Point a Stripe webhook at the `stripe-webhook` function for `checkout.session.completed` and `customer.subscription.*` events. |

### Plans and limits

Prices and monthly limits live in `src/config/pricing.ts`. The database enforces the same limits in `public.plan_monthly_limit()`, so if you change one, change the other with a new migration. Free results are watermarked and capped at standard resolution. Every user is limited to 10 runs a minute.

## How staging works

`supabase/functions/stage-room` does everything on the server:

1. Checks the signed-in user, validates the request, and reserves credits (`reserve_staging()`).
2. Loads the original from the user's own storage folder (or, for refines, the private clean copy of the image being edited).
3. Calls the image model with a prompt built in `_shared/prompts.ts` that tells it to keep the room's architecture, windows and light exactly as they are. If a model fails, it falls back to the next one in the chain.
4. Saves a clean master to the private `staging-masters` bucket and the finished JPEG (with the watermark or "Virtually staged" label if needed) to the public `stagings` bucket, then inserts the row.
5. Refunds any credit that didn't become a saved image.

`supabase/functions/detect-room` looks at an uploaded photo with a small vision model and suggests the room type and tool. It never uses a credit.

## Local development

```sh
bun install
bun run dev        # http://localhost:8080
bun run test       # unit tests (prompts, models, quotas, billing, export)
bun run build
```

In development, `/__studio` shows the studio and result viewer without signing in, for UI work. It isn't included in production builds.

Database changes go in `supabase/migrations/`. Lovable doesn't run migrations pushed from GitHub, so apply new ones from the Lovable editor (or ask the agent to) after pushing.
