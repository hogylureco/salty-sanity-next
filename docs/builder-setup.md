# Builder.io setup (marketing composition layer)

Builder composes **marketing** pages only. Spot, taxonomy, blog, and sitemap
routes stay pure Next + Sanity. Sanity remains the sole content authority —
Builder blocks take **identifiers**, never content.

## 1. API key

- Get the **public API key** from your Builder space → **Account Settings**.
- Put it in `NEXT_PUBLIC_BUILDER_API_KEY`:
  - local: `.env.local`
  - production: Vercel env vars
- It's public/client-exposed by design.

Without a key, the marketing route `notFound()`s every path (including `/`).

## 2. Model

Create a Builder model named exactly **`page`** (type: Page). The Next catch-all
`app/(marketing)/[[...page]]/page.tsx` fetches the `page` entry whose URL matches
the request path via `fetchOneEntry({ model: 'page', userAttributes: { urlPath } })`.

- `/` (the homepage) is owned by this catch-all — create a `page` entry at URL `/`.
- Literal routes (`/spots`, `/species`, `/api/*`, `/sitemap.xml`, …) take
  precedence over the catch-all — Builder can't shadow them.
- Publish → live has up to **1h latency** (the route's `revalidate = 3600`).

## 3. Preview / editing URL (Codespaces gotcha)

In Builder, set the space's **Preview URL** to your running app's origin.

- **Local:** `http://localhost:3000`
- **Codespaces:** `https://<codespace>-3000.app.github.dev` — and the forwarded
  port **3000 must be set to PUBLIC visibility** (Ports panel → right-click →
  Port Visibility → Public), or Builder's editor iframe can't load the site.
  The preview URL **changes every time the Codespace name changes**, so update
  it in Builder when you spin up a new Codespace.

Editing works because the route reads `isPreviewing(searchParams)` /
`getBuilderSearchParams(searchParams)` and renders draft content when previewing
(that request renders dynamically; published pages still ISR).

## 4. Registered components

Available in the Builder editor's "Insert" panel (from
`components/builder/registered-components.tsx`). Each takes identifiers only —
no rich text, no narrative, no image overrides (Sanity owns all of that).

| Block | Inputs | Renders |
|---|---|---|
| **SpotCardBlock** | `spotSlug` (string) | the `<SpotCard>` for that spot |
| **RegionSpotGrid** | `regionCode` (string, e.g. `BB`, `CCB`, `NS`) | grid of `<SpotCard>`s for the region (id-prefix match) |
| **ConditionsWidget** | `spotId`, `tideStationId`, `currentStationId` (strings) | the `<SpotConditions>` tide/current module |
| **SpotMapBlock** | `lat`, `lng` (number), `name` (string), `zoom` (number, default 13) | the Leaflet `<SpotMapLoader>` |

Notes:
- **ConditionsWidget takes station ids, not lat/lng.** `<SpotConditions>` is
  driven by NOAA station ids (there's no client-side lat/lng → station lookup),
  so wrapping it with lat/lng inputs would require forking it. Per the "reuse,
  never fork" rule, it's registered with the inputs it actually consumes.
- All blocks read the **published** Sanity perspective (public dataset) and each
  handles a bad slug / empty region with a quiet placeholder — a wrong value
  never crashes the page.
- `RegionSpotGrid` matches both `BB.` (draft ids) and `BB_` (published ids are
  sanitized to underscores).
