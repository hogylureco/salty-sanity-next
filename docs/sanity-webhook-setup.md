# Sanity → Next.js revalidation webhook

Exact values to paste into **sanity.io/manage → API → Webhooks → Create webhook**.
This makes a *publish* in Studio invalidate the affected Next.js cache tags within
seconds, instead of waiting out the 3600s ISR window (which stays as a safety net).

## Webhook configuration

| Field | Value |
|---|---|
| **Name** | `Next.js revalidation (production)` |
| **Description** | Invalidates Next.js cache tags on publish/delete. |
| **URL** | `https://<PRODUCTION-DOMAIN>/api/revalidate` — fill in after the Vercel deploy exists |
| **Dataset** | `production` |
| **Trigger on** | ✅ Create ✅ Update ✅ Delete |
| **Filter** | see below |
| **Projection** | see below |
| **HTTP method** | `POST` |
| **HTTP headers** | none |
| **API version** | `2025-06-01` (match the app's `NEXT_PUBLIC_SANITY_API_VERSION`) |
| **Include drafts** | **OFF** — publishes only |
| **Secret** | the value of `SANITY_REVALIDATE_SECRET` (see below) |
| **Status** | Enabled |

### Filter (GROQ)

Document types that have a route, plus `video` (which has no route of its own
but renders as cards in each spot page's Videos tab), trigger revalidation.
`mode` (no slug/route, not surfaced) stays excluded.

```groq
_type in [
  "spot", "video",
  "targetSpecies", "structure", "structureType", "approach", "techniqueRetrieve",
  "lureCatalog", "lureGearCategory", "parentLure", "baitfish", "microSeason",
  "region", "season", "zone"
]
```

### Projection (GROQ)

```groq
{
  "_type": _type,
  "slug": slug.current,
  "id": id,
  "operation": delta::operation()
}
```

- `delta::operation()` returns `"create" | "update" | "delete"` and is supported
  in webhook projections (the `delta::` namespace is available in filters and
  projections). The handler treats all operations identically — a delete/unpublish
  must invalidate the same tags so lists and the sitemap drop the doc.
- Fallback: if `delta::operation()` ever becomes unavailable, drop it from the
  projection — Sanity also sends the operation in the `sanity-operation` request
  header (`create`/`update`/`delete`), which the handler could read instead.

## Secret

`SANITY_REVALIDATE_SECRET` must be **identical** in three places: this webhook's
Secret field, the Vercel project env vars (Production), and local `.env.local`.

A value was generated for this project (via `openssl rand -base64 32`). It is
**not committed** — store it in the Vercel dashboard and paste it into the Sanity
webhook Secret field. To rotate, generate a new one and update all three places:

```bash
openssl rand -base64 32
```

## What the handler does with the payload

`POST /api/revalidate` (`app/api/revalidate/route.ts`, Node runtime) validates the
`sanity-webhook-signature` header with `@sanity/webhook` against the raw body, then:

| `_type` | Tags revalidated |
|---|---|
| `spot` | `spot:<slug>`, `spot` |
| `video` | `video`, `spot` |
| any taxonomy type (list above minus `spot`/`video`) | `<type>:<slug>`, `spot` |
| anything else | none — responds `200 {skipped:true}` |

`spot` is deliberately broad: spot pages, index/card lists, and the sitemap all
carry the `spot` tag, so any publish keeps them fresh. Per-referencing-page
precision isn't worth the complexity at this content volume.

## Verifying after setup

Use Studio to publish `BB.WE.fs - West End of the Canal`, then check the webhook's
**Attempts log** (three-dot menu) for a `200` with body
`{"revalidated":["spot:buzzards-bay-west-end-of-the-canal","spot"],"now":…}`.
