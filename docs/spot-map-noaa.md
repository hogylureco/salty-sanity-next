# SpotMap → NOAA nautical charts (base-layer swap)

_Verified 2026-07-17. Touches only `components/map/SpotMap.tsx`._

## Step 1 — chosen service

**NOAA Chart Display Service (NCDS), OGC WMS**, consumed via Leaflet core's
`L.tileLayer.wms` — **no new dependency**.

- **Endpoint:** `https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer`
- **Params:** `LAYERS=0..12`, `FORMAT=image/png`, `TRANSPARENT=true`,
  `VERSION=1.3.0`, `CRS=EPSG:3857` (Leaflet default). Renders NOAA ENC data with
  traditional paper-chart symbology — matches the old Webflow "NOAA Office of
  Coast Survey" look.

**Why not the alternatives:**
- **RNC / Seamless raster tile service (`tileservice.charts.noaa.gov`) — GONE.**
  NOAA shut down the Raster Navigational Chart tile services on 2025-03-15 and
  completed the raster/paper sunset in Dec 2024. The old code's endpoint
  (`/arcgis/services/MCS/NOAAChartDisplay/MapServer/WMSServer`) is a stale path.
- **NCDS WMTS** (`.../MarineChart_Services/NOAACharts/MapServer/WMTS`) — advertises
  a `GoogleMapsCompatible` XYZ scheme, but every tile request (REST and KVP)
  returns **HTTP 400 "Invalid URL"**. Not usable, so no free XYZ path exists.
- **Esri REST MapServer** — would require the `esri-leaflet` dependency; avoided.

**Terms / limits:** NOAA charts are public domain; attribution to the Office of
Coast Survey is requested (no API key, no published hard rate limit). Tiles load
as `<img>` (no CORS/fetch), so the browser same-origin policy doesn't apply.
Government service — occasional `tileerror` is expected (hence the fallback).

**Zoom range:** WMS GetMap returns chart content from ~z7 to z18 (server-side
ENC composite — no hard blank-tile cliff), but detail is meaningful ~**z9–z16**;
past z16 it over-zooms into sparse soundings. Policy below clamps to that band.

**Validated tiles (WMS GetMap, all returned chart PNGs):**

| Test point | approx lat,lng | z13 tile |
|---|---|---|
| Cape Cod Canal east end | 41.77, -70.50 | 4.6 KB ✓ |
| Buzzards Bay | 41.55, -70.80 | 26 KB ✓ |
| Vineyard Sound / Noman's Land | 41.25, -70.81 | 36 KB ✓ |
| Outer Cape backside | 41.85, -69.95 | 22 KB ✓ |

## Step 2 — implementation (`components/map/SpotMap.tsx`)

- `NOAA_CHART_WMS` is now the **primary base** (was layered over OSM). Attribution
  `© NOAA Office of Coast Survey`; Leaflet prepends its own credit →
  **"Leaflet | © NOAA Office of Coast Survey"** (confirmed in-render).
- **Zoom policy:** `MAP_MIN_ZOOM=9`, `MAP_MAX_ZOOM=16`, `DEFAULT_ZOOM=14`
  (tighter than the old `13` so soundings/contours show on load). Set on the map
  **and** both layers; the incoming `zoom` prop is clamped into the band so a
  spot's `zoomLevel` can't reach blank/over-zoomed tiles.
- **Fallback (never a gray grid):** `OSM_FALLBACK` kept as a named constant. A
  `tileerror` counter on the NOAA layer, bounded to the first 8 s of load, swaps
  to OSM after **6** failed tiles and `console.warn`s. One-shot; a stray later
  error won't demote a working chart.
- Marker, coordinate guards, StrictMode cleanup, and the `ssr:false` dynamic
  import are unchanged.

## Step 3 — OpenSeaMap overlay: **do not add** (redundant)

Rendered the Canal test point with and without the OpenSeaMap seamark overlay
(`tiles.openseamap.org/seamark/{z}/{x}/{y}.png`). The two are nearly identical —
the NOAA base **already charts every buoy, light, and aid** in official
symbology. The overlay adds only a duplicate buoy marker near Town Beach
(double-plotting the same aid) and would introduce clutter. Recommendation: keep
it off. (Screenshots `shot-7-canal-no-overlay` / `shot-8-canal-with-overlay`.)

## Step 4 — verification (Playwright/Chromium, headless)

- **4 test points @ z14:** all render charted detail (soundings, depth contours,
  magenta aids, chart land/water fill) — not streets. 0 tile errors.
- **Zoom extremes:** z9 (wide coastal chart) and z16 (harbor detail) both render;
  **no blank-tile state reachable** (map clamped to 9–16).
- **Simulated NOAA outage** (blocked the tile host): 6 tileerrors → fallback
  engaged, `console.warn` fired, map shows **OSM streets** with attribution
  switched to "© OpenStreetMap". Page unaffected.
- **Real component** (`/spots/west-end-of-the-canal`, dev server): renders the
  NOAA chart with the teardrop marker; attribution exactly
  `Leaflet | © NOAA Office of Coast Survey`.
- **`next build`:** exit 0, `/spots/[slug]` still **● SSG** (nothing regressed to
  dynamic). **No `esri-leaflet` added** — the only dep is the existing
  `leaflet@^1.9.4`; bundle change is the layer config only.

## Caveats / future
- WMS = one GetMap request per 256px tile; faint seams can appear at high zoom
  (cosmetic, ArcGIS antialiasing). Acceptable; matches prior behavior.
- No hard rate limit is published, but it's a single government host. If we ever
  see throttling/instability, revisit **proxying tiles through the Cloudflare
  Worker** (edge-cache the WMS) — explicitly out of scope for this task.
