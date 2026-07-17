# Worker CORS allowlist (hand-off to `salty-cape-api`)

The Salty Cape Next.js app fetches tide/current/conditions data **client-side**
from the Cloudflare Worker at `https://salty-cape-api.hogylureco.workers.dev`.

## Current live status (re-probed 2026-07-17) — PARTIALLY deployed

The reflection logic below is **already partly live**: the Worker now reads the
`Origin` header and reflects it for a small allowlist. Measured today:

| Origin | Live status |
|---|---|
| `https://salty-cape.webflow.io` | ✅ reflected |
| `https://www.saltycape.com` | ✅ reflected |
| `https://saltycape.com` (apex = `NEXT_PUBLIC_SITE_URL`) | ❌ **blocked** — falls back to webflow |
| `http://localhost:3000` | ❌ **blocked** |
| `https://<name>-<port>.app.github.dev` (Codespaces) | ❌ **blocked** — the `*.app.github.dev` regex is **not** deployed |
| `https://*.vercel.app` (if Vercel previews are used) | ❌ blocked |

**Remaining delta to apply on the Worker:** add the apex `saltycape.com`,
`http://localhost:3000`, the `*.app.github.dev` pattern, and any Vercel host.
Until then, the production apex domain, local dev, and Codespaces previews all
render the module's fallback state despite the reflection logic being present.
**No change is needed in this (Next.js) repo** — once the Worker allowlist is
completed, the modules show live data automatically.

## The key constraint

`Access-Control-Allow-Origin` may only be a **single exact origin** or `*` — it
**cannot** be a comma-separated list or a wildcard subdomain like
`https://*.app.github.dev`. To support several origins (and ephemeral Codespaces
previews) the Worker must read the request's `Origin` header, check it against an
allowlist, and **reflect** it back when allowed.

## Origins to allow

| Origin | Purpose |
|---|---|
| `https://salty-cape.webflow.io` | existing Webflow embed — **keep** |
| `http://localhost:3000` | local Next dev |
| `https://saltycape.com` | production (`NEXT_PUBLIC_SITE_URL`) |
| `https://www.saltycape.com` | production www (if used) |
| `https://*.app.github.dev` | **all** GitHub Codespaces previews — pattern-match, not literal |

The codespace host/port changes per environment (e.g. it was
`https://improved-space-barnacle-6vw9xj469vwcxvrx-3000.app.github.dev`), so match
the `*.app.github.dev` pattern rather than pinning a specific host.

Note: the app's calls are simple `GET`s with no custom headers, so no `OPTIONS`
preflight fires — the Worker only needs the correct `Access-Control-Allow-Origin`
on the actual GET response. Preflight support below is belt-and-suspenders.

## Drop-in reflection logic (Cloudflare Worker)

```js
const EXACT_ALLOWED = new Set([
  'https://salty-cape.webflow.io',
  'http://localhost:3000',
  'https://saltycape.com',
  'https://www.saltycape.com',
])

function isAllowedOrigin(origin) {
  if (!origin) return false
  if (EXACT_ALLOWED.has(origin)) return true
  // GitHub Codespaces port-forward previews: https://<name>-<port>.app.github.dev
  return /^https:\/\/[a-z0-9-]+\.app\.github\.dev$/.test(origin)
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin')
  const headers = {
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin', // so the CDN doesn't cache one origin's ACAO for another
  }
  if (isAllowedOrigin(origin)) headers['Access-Control-Allow-Origin'] = origin
  return headers
}
```

Apply `corsHeaders(request)` to **both** the `OPTIONS` short-circuit and every
actual JSON response (currently it's hardcoded to the single Webflow origin).

## Gotchas

- **`Vary: Origin` is required.** Without it, Cloudflare's cache can serve one
  origin's `Access-Control-Allow-Origin` header to a different origin and
  reintroduce the block intermittently.
- **No credentials.** The app sends no cookies/auth, so do **not** add
  `Access-Control-Allow-Credentials: true` — that would forbid reflecting the
  `*.app.github.dev` previews and isn't needed.

## Verifying after deploy

```bash
# Should echo back the Origin you send, not the Webflow origin:
curl -s -I -H "Origin: http://localhost:3000" \
  "https://salty-cape-api.hogylureco.workers.dev/tides?station=8443970&days=1" \
  | grep -i access-control-allow-origin
```
