'use client'

import { useEffect, useRef } from 'react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { stegaClean } from '@sanity/client/stega'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { WORKER_URL } from '@/lib/worker'

import { MAP_HEIGHT, type SpotMapProps } from './mapConstants'

/**
 * Zoom policy. The Worker renders NOAA charts across the whole slippy-tile range,
 * so we allow deep zoom (max ~19). The seamark overlay caps its native requests at
 * z18 and upscales past that (see maxNativeZoom below) rather than 404-ing. Default
 * per-spot zoom is tighter than a street map's so soundings and depth contours are
 * visible on load (overridden by a spot's `zoomLevel`).
 */
const MAP_MIN_ZOOM = 9
const MAP_MAX_ZOOM = 19
const DEFAULT_ZOOM = 14

/**
 * Below this zoom the nearby-spot labels are suppressed (only the current spot
 * stays labelled) — permanent tooltips overlap fast on a small map, so a zoom
 * gate is the declutter mechanism (no collision library). Overridable per call
 * via the `minLabelZoom` prop. Default sits just under the per-spot default
 * zoom (14) so neighbours label up as soon as the user is close enough to read
 * them apart.
 */
const DEFAULT_MIN_LABEL_ZOOM = 12

/**
 * Base + overlay tile registry. The Salty Cape Worker exposes the NOAA charts and
 * the OpenSeaMap seamark overlay as ordinary XYZ tile routes — it does the WMS→XYZ
 * translation server-side — so every layer here is a vanilla `L.tileLayer`: no WMS
 * code, and the browser never calls NOAA directly. The Worker origin comes from
 * `WORKER_URL` (NEXT_PUBLIC_WORKER_URL, see lib/worker.ts) — never hardcode a host.
 */
const NOAA_ATTRIBUTION =
  'Chart data &copy; NOAA Office of Coast Survey — not for navigation'
const SEAMARK_ATTRIBUTION = '&copy; OpenSeaMap contributors'

/** NOAA raster charts, two renderings served by the Worker as XYZ tiles. */
const NOAA_PAPER_TILES = `${WORKER_URL}/noaa-chart/paper/{z}/{x}/{y}`
const NOAA_ECDIS_TILES = `${WORKER_URL}/noaa-chart/ecdis/{z}/{x}/{y}`

/** Transparent seamark overlay (buoys, lights, beacons, depth contours). */
const SEAMARK_TILES = `${WORKER_URL}/openseamap/{z}/{x}/{y}`

/**
 * Plain OSM raster — the "Standard" base option. Loaded DIRECTLY from
 * openstreetmap.org (never proxied through the Worker).
 */
const OSM_STANDARD = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap',
}

// Navy is a chart-only color with no brand token (the palette in globals.css is
// green/red accents). Kept in one place so the current-spot marker and its label
// chip stay in sync. `_CHIP` is the same navy, semi-opaque, for the label plate.
const NAVY = '#2b6cb0'
const NAVY_CHIP = 'rgba(43, 108, 176, 0.92)'
// Nearby-label plate: a near-white, semi-opaque "sand" chip so the dark spot
// name reads over the busy chart, with a seafoam (green-dark token) left-edge +
// eyebrow marking it as nearby — colour alone would fail colourblind users, so
// the "NEARBY" tag carries the meaning. There is no sand brand token, so the
// plate colour is a literal (like NAVY_CHIP); the seafoam accents use the token.
const SAND_CHIP = 'rgba(255, 255, 255, 0.92)'
// Deep navy used for the spot name text on the light nearby chip (matches the
// popup styling elsewhere in this file). Chart-only ink, no brand token.
const LABEL_INK = '#0f2a43'

/**
 * A pure-CSS teardrop pin via `L.divIcon` — no image URLs, so it sidesteps
 * Leaflet's bundler-broken default icon AND the flaky node_modules PNG imports
 * under Turbopack (which resolved to no usable `.src`). Styling is Phase 8.
 */
const spotIcon = L.divIcon({
  className: 'spot-map-marker',
  html: `<span style="display:block;width:16px;height:16px;background:${NAVY};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 3px rgba(0,0,0,.5)"></span>`,
  iconSize: [16, 16],
  iconAnchor: [8, 16],
  popupAnchor: [0, -16],
})

/**
 * Nearby-spot marker: a seafoam circle (green-light fill / green-dark ring, per
 * the design tokens) — deliberately a different color AND shape from the current
 * spot's navy teardrop, so the "you are here" marker stays unmistakable. Smaller,
 * too, to keep the current spot visually dominant.
 */
const nearbyIcon = L.divIcon({
  className: 'spot-map-marker spot-map-marker--nearby',
  html: '<span style="display:block;width:13px;height:13px;background:#64ffda;border:2px solid #0a7c5f;border-radius:50%;box-shadow:0 0 3px rgba(0,0,0,.4)"></span>',
  iconSize: [13, 13],
  iconAnchor: [6.5, 6.5],
  popupAnchor: [0, -8],
})

// Shared font stack for the label chips (IBM Plex Sans via the design token).
const LABEL_FONT = 'var(--font-sans), system-ui, sans-serif'

/**
 * Stega-clean a title for a tooltip. Zero-width Visual-Editing characters would
 * otherwise render as artifacts inside the label. Returns null for an
 * empty/missing title so the caller can skip binding a tooltip (no crash).
 */
function cleanTitle(value: string | null | undefined): string | null {
  const cleaned = stegaClean(value)
  return typeof cleaned === 'string' && cleaned.trim() !== '' ? cleaned : null
}

/**
 * Permanent-label plate for the current spot: a navy, semi-opaque chip with
 * white DM-Sans-equivalent text — the dominant label. Semi-opaque + shadow keeps
 * it legible over the dense chart symbology. textContent (never innerHTML) so a
 * spot name can't inject markup. Leaflet's own tooltip chrome/arrow is stripped
 * in globals.css (`.spot-label`).
 */
function currentLabelEl(title: string): HTMLElement {
  const chip = document.createElement('span')
  chip.textContent = title
  chip.style.cssText =
    `display:inline-block;font-family:${LABEL_FONT};` +
    `background:${NAVY_CHIP};color:#fff;font-size:0.82rem;font-weight:700;` +
    'padding:2px 8px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,.4)'
  return chip
}

/**
 * Permanent-label plate for a nearby spot: a light "sand" chip, seafoam-marked
 * as nearby. A small caps "NEARBY" eyebrow (green-dark token) sits over the spot
 * name + great-circle distance, so the label is distinguished from the current
 * spot both by colour AND by text (colour alone fails colourblind users). The
 * marker itself stays click-to-navigate; this label just reads which spot it is
 * without a click. textContent (never innerHTML) so a spot name can't inject
 * markup. Tooltip chrome/arrow is stripped in globals.css (`.spot-label`).
 */
function nearbyLabelEl(title: string, distanceNmi: number): HTMLElement {
  const chip = document.createElement('span')
  chip.style.cssText =
    `display:inline-block;text-align:left;font-family:${LABEL_FONT};` +
    `background:${SAND_CHIP};border-left:3px solid var(--green-dark);` +
    'padding:2px 8px;border-radius:5px;box-shadow:0 1px 3px rgba(0,0,0,.35)'

  const eyebrow = document.createElement('span')
  eyebrow.textContent = 'NEARBY'
  eyebrow.style.cssText =
    'display:block;font-size:0.6rem;font-weight:700;letter-spacing:0.08em;' +
    'line-height:1.1;color:var(--green-dark)'

  const nameLine = document.createElement('span')
  nameLine.textContent =
    Number.isFinite(distanceNmi) && distanceNmi > 0
      ? `${title} · ${distanceNmi.toFixed(1)} nmi`
      : title
  nameLine.style.cssText =
    `display:block;font-size:0.76rem;font-weight:600;line-height:1.2;color:${LABEL_INK}`

  chip.append(eyebrow, nameLine)
  return chip
}

/**
 * Coerce a coordinate to a finite number; treat anything else as missing.
 * `stegaClean` first strips any zero-width Visual-Editing characters a Sanity
 * string field may carry — a stega-tainted coordinate would otherwise NaN out or
 * silently shift the map center. (Harmless no-op on plain numbers.)
 */
function toCoord(value: number | string | null | undefined): number | null {
  const cleaned = stegaClean(value)
  if (cleaned === null || cleaned === undefined || cleaned === '') return null
  const n = typeof cleaned === 'number' ? cleaned : Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Same stega-safe coercion for the zoom level, falling back to the default. */
function toZoom(value: number | undefined): number {
  const cleaned = stegaClean(value)
  const n = typeof cleaned === 'number' ? cleaned : Number(cleaned)
  return Number.isFinite(n) ? n : DEFAULT_ZOOM
}

/**
 * Clean, low-contrast base used UNDER the SST overlay. The NOAA chart's dense
 * symbology fights a color heat-layer, so the SST view swaps the chart for this
 * light basemap — land/coastline for context, nothing that competes with the
 * temperature colors. (The plain nautical-chart view keeps the NOAA base.)
 */
const LIGHT_BASE = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
  subdomains: 'abcd',
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
}

/**
 * XWeather sea-surface-temperature raster, proxied same-origin (the proxy holds
 * the credentials — see app/api/xweather). Painted on its own pane above the
 * base tiles but below the marker. Opaque enough to read as a heat-map over the
 * light base. `maxNativeZoom` caps upstream requests (SST is coarse, updates
 * ~6h) and lets Leaflet upscale past it instead of requesting empty high-zoom
 * tiles.
 */
const SST_OVERLAY = {
  url: '/api/xweather/maritime-sst/{z}/{x}/{y}',
  opacity: 0.85,
  maxNativeZoom: 10,
}

export default function SpotMap({
  lat,
  lng,
  name,
  zoom = DEFAULT_ZOOM,
  sstOverlay = false,
  nearby = [],
  fitNearbyBounds = false,
  showLabels = true,
  minLabelZoom = DEFAULT_MIN_LABEL_ZOOM,
}: SpotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const latNum = toCoord(lat)
  const lngNum = toCoord(lng)
  const zoomNum = toZoom(zoom)
  const hasCoords = latNum !== null && lngNum !== null

  // Read `nearby` through a ref so the map-building effect can depend on a stable
  // primitive key (the slug list) instead of the array's identity — otherwise a
  // parent re-render would rebuild the whole Leaflet map every render. The ref is
  // synced in its own effect (declared before the map effect, so it runs first).
  const nearbyRef = useRef(nearby)
  const nearbyKey = nearby.map((n) => n.slug).join(',')
  useEffect(() => {
    nearbyRef.current = nearby
  }, [nearby])

  useEffect(() => {
    if (latNum === null || lngNum === null || !containerRef.current) return
    // Clamp the requested zoom into the chart-supported band so a spot's own
    // zoomLevel can't land the view on blank/over-zoomed tiles.
    const initialZoom = Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, zoomNum))
    const map = L.map(containerRef.current, {
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
    }).setView([latNum, lngNum], initialZoom)

    if (sstOverlay) {
      // SST view: clean light base (no nautical-chart clutter) + the SST heat
      // layer on top, so the temperature colors render clearly.
      L.tileLayer(LIGHT_BASE.url, {
        subdomains: LIGHT_BASE.subdomains,
        attribution: LIGHT_BASE.attribution,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
      }).addTo(map)

      map.createPane('sst')
      const sstPane = map.getPane('sst')
      if (sstPane) sstPane.style.zIndex = '350'
      L.tileLayer(SST_OVERLAY.url, {
        pane: 'sst',
        opacity: SST_OVERLAY.opacity,
        maxNativeZoom: SST_OVERLAY.maxNativeZoom,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        attribution: '&copy; XWeather',
      }).addTo(map)
    } else {
      // Chart view: three mutually-exclusive base layers + a seamark overlay,
      // every one a plain XYZ tile layer (Worker-served, or OSM direct for
      // Standard) toggled through Leaflet's layer control.

      // NOAA paper chart — the traditional look, and the default (fishing product).
      const paper = L.tileLayer(NOAA_PAPER_TILES, {
        attribution: NOAA_ATTRIBUTION,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
      })
      // NOAA ECDIS — the S-52 electronic-chart rendering.
      const ecdis = L.tileLayer(NOAA_ECDIS_TILES, {
        attribution: NOAA_ATTRIBUTION,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
      })
      // Standard — plain OSM raster (loaded direct, never through the Worker).
      const standard = L.tileLayer(OSM_STANDARD.url, {
        attribution: OSM_STANDARD.attribution,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
      })

      // Seamark overlay on its own pane so it always sits above the active base
      // (base tiles share the default tilePane; switching base must not cover it).
      map.createPane('seamarks')
      const seamarkPane = map.getPane('seamarks')
      if (seamarkPane) seamarkPane.style.zIndex = '350'
      const seamarks = L.tileLayer(SEAMARK_TILES, {
        pane: 'seamarks',
        attribution: SEAMARK_ATTRIBUTION,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        // Cap native requests at z18 and upscale past it, rather than 404-ing
        // into empty high-zoom seamark tiles.
        maxNativeZoom: 18,
      })

      // Default base — change this one line to swap the default rendering.
      paper.addTo(map)
      seamarks.addTo(map) // overlay ON by default

      L.control
        .layers(
          {
            'Nautical Chart': paper,
            'Electronic (ECDIS)': ecdis,
            Standard: standard,
          },
          { Seamarks: seamarks },
          { collapsed: true },
        )
        .addTo(map)
    }

    // Current spot: navy marker + an always-visible name label (dominant). The
    // label replaces the old click popup; interactive:false so it never eats a
    // click. Title is stega-cleaned; a missing title just gets no label.
    const currentMarker = L.marker([latNum, lngNum], { icon: spotIcon }).addTo(map)
    const currentTitle = cleanTitle(name)
    if (showLabels && currentTitle) {
      currentMarker.bindTooltip(currentLabelEl(currentTitle), {
        permanent: true,
        interactive: false,
        direction: 'top',
        offset: [0, -8],
        className: 'spot-label spot-label--current',
      })
    }

    // Nearby-spot markers (seafoam). Each carries an always-visible seafoam label
    // (name + distance, "NEARBY"-tagged) and navigates on click via the Next
    // router (soft nav — no reload). interactive:false on the tooltip so the label
    // never eats that click. Reads the ref so an array-identity change alone
    // doesn't re-run this effect (nearbyKey does).
    const markers = nearbyRef.current
    // Track each nearby marker with its label content so the zoom gate below can
    // bind/unbind the permanent tooltip without rebuilding the map.
    const nearbyLabelled: Array<{ marker: L.Marker; content: () => HTMLElement }> = []
    for (const m of markers) {
      const marker = L.marker([m.lat, m.lng], { icon: nearbyIcon }).addTo(map)
      marker.on('click', () => router.push(`/spots/${m.slug}`))
      // Null-guard the title: a nearby spot whose title stega-cleans to nothing
      // (weak-ref with no name) simply gets no label — never a crash.
      const title = cleanTitle(m.name)
      if (showLabels && title) {
        nearbyLabelled.push({
          marker,
          content: () => nearbyLabelEl(title, m.distanceNmi),
        })
      }
    }

    // Clutter control: permanent labels overlap fast, so below `minLabelZoom` the
    // nearby labels are suppressed (the current-spot label always stays). Bind /
    // unbind the permanent tooltips on zoom crossing the threshold — no collision
    // library, just a gate. Runs once now for the initial (or fitBounds) zoom.
    const syncNearbyLabels = () => {
      const show = map.getZoom() >= minLabelZoom
      for (const { marker, content } of nearbyLabelled) {
        const bound = marker.getTooltip() != null
        if (show && !bound) {
          marker.bindTooltip(content(), {
            permanent: true,
            interactive: false,
            direction: 'top',
            offset: [0, -8],
            className: 'spot-label spot-label--nearby',
          })
        } else if (!show && bound) {
          marker.unbindTooltip()
        }
      }
    }
    map.on('zoomend', syncNearbyLabels)

    // Widen the view to take in the neighbors — but only when the page vouched
    // that they're all within the cap radius, so a far outlier can't zoom us out.
    // Otherwise the current spot stays centered at its own zoom (setView above).
    if (fitNearbyBounds && markers.length > 0) {
      const bounds = L.latLngBounds([
        [latNum, lngNum],
        ...markers.map((m) => [m.lat, m.lng] as [number, number]),
      ])
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: MAP_MAX_ZOOM })
    }

    // Apply the zoom gate for the initial (post-fitBounds) zoom. `zoomend` covers
    // every later change; fitBounds may not emit one if the zoom didn't change,
    // so prime it here.
    syncNearbyLabels()

    // The map can mount inside a hidden tab panel (display:none → 0×0 container),
    // where Leaflet reads a zero size and lays down only a partial tile grid that
    // never recovers when the panel is shown ("a few tiles top-right, rest gray").
    // A ResizeObserver re-syncs Leaflet's cached size whenever the container gains
    // or changes dimensions (tab reveal, side-by-side reflow, window resize).
    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(containerRef.current)

    // Destroy on unmount — React StrictMode double-mounts in dev would otherwise
    // leak map instances / throw "Map container is already initialized".
    return () => {
      ro.disconnect()
      map.remove()
    }
  }, [
    latNum,
    lngNum,
    zoomNum,
    name,
    sstOverlay,
    nearbyKey,
    fitNearbyBounds,
    showLabels,
    minLabelZoom,
    router,
  ])

  if (!hasCoords) {
    return (
      <div style={{ height: MAP_HEIGHT }}>
        <p>Location not available</p>
      </div>
    )
  }

  return (
    <div>
      <div
        ref={containerRef}
        style={{ height: MAP_HEIGHT, width: '100%' }}
        aria-label={`Map showing ${name}`}
      />
      {/* Quiet legal line beneath the Leaflet canvas (not inside it). The SST view
          has its own footer, so only the chart view carries this. */}
      {!sstOverlay && (
        <p
          style={{
            margin: 0,
            padding: '4px 8px',
            fontSize: '0.7rem',
            lineHeight: 1.4,
            color: '#6b7280',
          }}
        >
          Charts for reference only — not for navigation.
        </p>
      )}

      {/* Nearby spots caption + a horizontal, wrapping list of linked names. The
          seafoam markers carry no always-on label, so this is the readable index
          of what's nearby; each name is a soft-nav <Link> to the spot page. */}
      {nearby.length > 0 && (
        <div className="px-2 pb-2 pt-1 text-xs">
          <span className="font-mono uppercase tracking-wider text-header">
            Nearby spots
          </span>
          <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            {nearby.map((n) => (
              <li key={n.slug}>
                <Link
                  href={`/spots/${n.slug}`}
                  className="text-green-dark hover:underline"
                >
                  {n.name}
                </Link>
                <span className="text-header/50">
                  {' · '}
                  {n.distanceNmi.toFixed(1)} nmi
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
