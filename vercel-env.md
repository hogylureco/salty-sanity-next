# Vercel Environment Variables — Salty Cape

Add these in Vercel → **Settings → Environment Variables**.
Set scope to **Production** (and **Preview** if you want branch previews to work).

## Public (safe to expose — `NEXT_PUBLIC_` prefix)

```
NEXT_PUBLIC_SANITY_PROJECT_ID=

NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-06-01
NEXT_PUBLIC_SITE_URL=https://saltycape.com
NEXT_PUBLIC_WORKER_URL=https://salty-cape-api.hogylureco.workers.dev
NEXT_PUBLIC_BUILDER_API_KEY=
```

## Server-only (secrets — never prefix with `NEXT_PUBLIC_`)

```
SANITY_REVALIDATE_SECRET=
SANITY_API_READ_TOKEN=
SANITY_API_WRITE_TOKEN=
XWEATHER_CLIENT_ID=
XWEATHER_CLIENT_SECRET=
```

## Notes / values to fill in

- `NEXT_PUBLIC_SITE_URL` — your final live URL, **no trailing slash**. Use the `*.vercel.app` URL first, then switch to the custom domain once DNS is live.
- `NEXT_PUBLIC_BUILDER_API_KEY` — from the Builder.io space → Account Settings.
- `SANITY_REVALIDATE_SECRET` — generate with `openssl rand -base64 32`. Use the **same** value in Sanity Manage → API → Webhooks → Secret.
- `SANITY_API_READ_TOKEN` — **REQUIRED in production.** Salty Cape content lives in Sanity drafts (not published), and draft reads aren't anonymous — without this token the live site renders blank. Create at https://www.sanity.io/manage → project `y83nf1qy` → API → Tokens (Viewer role).
- `SANITY_API_WRITE_TOKEN` — only needed if you run `scripts/publish-all.ts` from Vercel. Not required at runtime; skip otherwise.
- `XWEATHER_CLIENT_ID` / `XWEATHER_CLIENT_SECRET` — from your XWeather (Aeris) account. Power the Sea Surface Temperature readout on the spot Weather tab via `/api/sst` (server-side only — the browser never sees them). Add the same two values to `.env.local` for local dev. Your third XWeather "API key"/maps token is **not** needed for SST.
