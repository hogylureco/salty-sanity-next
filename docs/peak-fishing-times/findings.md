# Peak Fishing Times — Worker + coverage audit (Steps 1–2)

_Audit date: 2026-07-17. Dataset: `y83nf1qy/production`, **drafts** perspective._

## 0. Access blocker (read this first)

**Could not read the Worker source.** The `GITHUB_TOKEN` in this environment is a
fine-grained token scoped to only `hogylureco/salty-cape-cms` and
`hogylureco/salty-sanity-next` (`x-accepted-github-permissions: metadata=read`).
`hogylureco/peak-fishing-times` returns **404** — no grant. All Step-1 findings
below are from **read-only probing of the deployed Worker** (`curl`), not source.
To read the source, grant this token repo access or drop a PAT that can see it.

## 1. The Worker (probed live)

- **Base URL:** `https://salty-cape-api.hogylureco.workers.dev`. This is the same
  Worker the app already uses. Its `/` and `/health` self-report as
  `service: "salty-cape-api"`. **There is no separate "peak-fishing-times"
  deployment reachable** — the "Peak Fishing Tides Today" module is assembled
  **client-side** from `/tides` + `/currents`. There is **no** peak/fishing
  endpoint on the Worker.
- **Endpoints (from `/health`):** `/tides`, `/currents`, `/metadata`,
  `/water-temp`, `/sst-point`, plus tile routes (`/xweather/...`, `/charts/...`,
  `/openseamap/...`, `/sst/...`).
  - `GET /tides?station=<tideId>&days=N` → `[{t:"YYYY-MM-DD HH:mm", v:"<ft>", type:"H"|"L"}]` (Eastern wall-clock).
  - `GET /currents?station=<currentId>&days=N` → `[{Type:"ebb"|"flood"|"slack", Time, Velocity_Major:<knots, − = ebb>, meanFloodDir, meanEbbDir, Depth, Bin}]`.
  - `GET /metadata?station=<id>` → `{stationId, stationName, lat, lng, state, type}`. **Works for both tide and current ids.**
- **ebb/flood + knots** come straight from **NOAA current-station predictions**
  (the Worker passes through NOAA's own `Type` and `Velocity_Major`). Tides come
  from NOAA tide predictions.
- **No 7-day/peak endpoint and no multi-day aggregation** — `days=N` on
  `/tides` and `/currents` is the only "multi-day" lever (a 7-day tab would just
  request `days=7`). This is the whole "7-day" story.
- **No nearest-station / station-list endpoint.** `/stations`, `/nearest` → 404.
  The Worker **cannot resolve lat/lng → station**; it requires an explicit id.
  It applies **no distance guard and no Bay-vs-Sound guard** — whatever station
  id you pass, it serves. Any resolution/sanity logic must live on our side.
- **Station id formats:** tide = 7-digit NOAA (`8443970`); current = NOAA
  current station (`ACT1546`, `COD0907`, `BOS1111`) with **no** bin suffix.
- **Caching:** `/tides` sends `cache-control: public, max-age=3600` (1 h edge
  cache). Only **23 distinct upstream stations** serve all 242 spots (4 tide +
  19 current), so ~300 spot pages generate ~23 cacheable upstream series — NOAA
  load is negligible and there is **no rate-limit exposure**. Keep the 5-min
  client cache; the Worker's 1 h is longer and dominates.
- **CORS:** reflection logic is **partly deployed** (contradicts the old
  `docs/worker-cors.md`, which said single hardcoded origin). Current live state:

  | Origin | Status |
  |---|---|
  | `https://salty-cape.webflow.io` | ✅ allowed |
  | `https://www.saltycape.com` | ✅ allowed |
  | `https://saltycape.com` (apex = `NEXT_PUBLIC_SITE_URL`) | ❌ **blocked** |
  | `http://localhost:3000` | ❌ **blocked** |
  | `https://<name>-3000.app.github.dev` (Codespaces) | ❌ **blocked** — regex not deployed |
  | `https://salty-sanity-next.vercel.app` | ❌ blocked (if Vercel used) |

  **Still to add** on the Worker: apex `saltycape.com`, `localhost:3000`, the
  `*.app.github.dev` pattern, and any Vercel preview host. Until then every
  non-Webflow/non-www origin (including this Codespace and prod apex) is blocked
  and the module shows its fallback state.

## 2. Coverage audit — 242 spots

### Resolution paths (as the schema stands today)
| Path | Count | Meaning |
|---|---|---|
| SERVABLE-EXPLICIT | **182** | has `tideStationId` and/or `currentStationId` (all 182 also have coords) |
| UNSERVABLE-NO-STATION | **20** | has coords but no station id — and the Worker has no nearest lookup, so unservable **today** |
| UNSERVABLE-NO-DATA | **40** | no coords and no station id |

Schema already has `tideStationId` + `currentStationId` (string) and
`latitude`/`longitude`, so **no new field is needed** — the gap is population,
not schema.

### The real problem: "servable" ≠ "correct"
Station ids are **explicitly set** in the CMS but are largely wrong-side:

- **Tide:** only **38 of 182** spots sit within 15 nm of their tide station.
  **144 are farther; 65 are 60+ nm away.** Cause: **140 spots use Boston
  (8443970)** — a **Mass-Bay, north-of-Cape** station — for spots on the **south**
  side (Nantucket Sound, Vineyard Sound, Buzzards Bay, Monomoy). Cape Cod tide
  timing differs by hours between Bay and Sound, so this is exactly the
  "wrong-side tide is worse than none" case. Correct assignments today are
  basically the Cape Cod Bay spots (Barnstable, 35) and a few Elizabeth Islands
  (Penikese, 6).
- **Current:** much healthier — **158 of 178 within 15 nm.** The **20 wrong-side**
  are Nantucket/east-Sound spots on **`BOS1111` = "Boston Harbor, Deer Island
  Light"** (55–78 nm) plus a few "The Race" spots on Barnstable current (~20 nm).
  Since the module's primary EBB/FLOOD pills + knots come from **currents**, the
  widget's core is trustworthy for ~158 spots; the secondary High/Low tide list
  is the mostly-wrong part.

### Data bugs found (separate from station backfill)
- **`The Hooter` (slug `/hooter`)** has **lat/lng swapped** (`lat=-70.43,
  lng=41.25`) and a malformed slug with a leading `/`.
- Several UNSERVABLE-NO-DATA docs are offshore/canyon marks (Coxes Ledge,
  Stellwagen, Regal Sword, etc.) and 3 have `name: null` / no slug — likely
  stubs, not real spot pages.

### Distance gate used
The Worker applies none, so this audit uses **15 nm** as the tide sanity
threshold and additionally flags Bay-vs-Sound wrong-side. Full per-spot table:
`docs/peak-fishing-times/resolution-table.csv` (one row per spot: coords, station
ids, distances, nearest tide station, resolution path, flag).

### Distinct stations
- Tide (4): `8443970` Boston, `8447335` Barnstable Harbor, `8448248` Penikese
  Island, `8447270` Buzzards Bay.
- Current (19): `ACT1546/1626/1666/1706/1736/1761/1766/1806/1831/1836/1841/1866/1951`,
  `BOS1111`, `COD0905/0906/0907/0913/0914`.

## 3. Frontend integration (done)

Per your Step-2 decisions (**render tide as-is**; **coords-only = UNSERVABLE for
now, no resolver**):

- **`components/spot/dashboard/PeakTidesToday.tsx`** (the dashboard module):
  - Added a **date header** (today in America/New_York, "Thu, Jul 17").
  - Added the designed **UNSERVABLE** state — when a spot has *neither* a tide nor
    a current id (computed synchronously from props, no fetch), it renders a quiet
    "Tide predictions unavailable for this location." This is distinct from the
    Worker-failure/CORS state ("Conditions unavailable").
  - Added a **loading skeleton** (was plain text).
  - Rewired **"View 7-day forecast →"** from the dead `/spots/[slug]/forecast`
    route (404) to `#fishing-times`, which `SpotTabs` picks up via its
    `hashchange` handler and opens the **Fishing Times** tab. Dropped the now-unused
    `slug` prop (and its page call-site arg).
  - Kept: currents = primary EBB (red pill) / FLOOD (green pill) / SLACK rows with
    knots in `font-mono` (= Inconsolata), tide High/Low secondary, 5-min client
    cache, Eastern formatting.
- **`components/spot/tabs/SevenDayConditions.tsx`** (Fishing Times tab): mirrored
  the same UNSERVABLE designed state so no-station spots match the dashboard
  instead of showing an error. Already used `days=7` (real multi-day data).
- **Not touched:** `components/conditions/SpotConditions.tsx` — only used by the
  Builder.io marketing widget (author enters ids), not the spot page.
- **7-day tab:** the endpoint "exists" only as `days=7` on `/tides` + `/currents`;
  the tab was already built against it. There is **no** richer fishing-times
  endpoint to build a fuller UI against, so nothing new was built there.

## 4. Verification

- **`next build`:** ✅ exit 0. `/spots/[slug]` still **● SSG** (190 prerendered
  paths); all data fetching remains client-side.
- **Designed states in prerendered HTML (network-free, so CORS-independent):**
  190 spot pages render the module; the 8 no-station spots in the *published*
  set (e.g. `bass-river-beach`, `prince-cove-marina`, `saquatucket-harbor`)
  render "Tide predictions unavailable" **at SSG time** with no 7-day link;
  servable spots render the skeleton + `#fishing-times` link. (Published set is a
  subset of the 242 drafts.)
- **Predictions differ appropriately (API layer):**
  - Currents are cleanly station-specific — `ACT1546` vs `BOS1111` vs `COD0907`
    vs `COD0914` differ in timing, direction, and velocity.
  - Tides: **Boston (11 ft range) ≈ Barnstable** (identical heights, ~11–30 min
    offset — both Cape-Cod-**Bay** regime), while **Penikese shows a ~4 ft range**
    — the genuine **south-side** regime. Confirms that the 140 south-side spots
    pinned to Boston get a Bay tide ~3× too large and hours off. All Boston-pinned
    spots share one identical tide table (the resolution collision).
- **Load behavior:** one mount = at most **2** Worker GETs (`/tides` + `/currents`,
  fired in parallel via `Promise.allSettled` — no waterfall), then a 5-min
  module cache; back/forward reuses it. Worker edge cache is 1 h.
- **⚠ Live browser check is blocked by CORS from this origin.** The Codespaces
  and localhost origins are not on the Worker allowlist (see
  `docs/worker-cors.md`), so a real browser fetch here returns the fallback
  state, not live data. End-to-end "live data in the browser" cannot be
  confirmed until the Worker allowlist is completed; the data itself is verified
  correct at the API layer above.

## Open items for you
1. **Complete the Worker CORS allowlist** (apex `saltycape.com`, `localhost:3000`,
   `*.app.github.dev`, Vercel) — see `docs/worker-cors.md`. Blocks live data.
2. **Station backfill (separate MCP task you'll commission):** fix ~140 south-side
   spots pinned to Boston tide and ~20 on `BOS1111` Boston-Harbor current. The
   resolved-station table + distances are in `resolution-table.csv` to seed it.
3. **Data bug:** `The Hooter` (slug `/hooter`) has swapped lat/lng + malformed slug.
4. **Grant token access** to `hogylureco/peak-fishing-times` if you still want the
   Worker *source* read (this pass characterized it live instead).
No new schema field is required — `tideStationId`/`currentStationId` already exist.
