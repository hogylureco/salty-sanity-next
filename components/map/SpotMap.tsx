'use client'

import { useEffect, useRef } from 'react'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { MAP_HEIGHT, type SpotMapProps } from './mapConstants'

/**
 * Zoom policy. NOAA ENC renders useful chart detail roughly z9–z16; past ~z16 it
 * over-zooms into sparse soundings, below ~z9 it's coastal overview. We clamp the
 * map AND the layers to this band so no interaction can reach blank/over-zoomed
 * tiles. Default per-spot zoom is tighter than a street map's so soundings and
 * depth contours are visible on load (overridden by a spot's `zoomLevel`).
 */
const MAP_MIN_ZOOM = 9
const MAP_MAX_ZOOM = 16
const DEFAULT_ZOOM = 14

/**
 * PRIMARY base: NOAA Chart Display Service (NCDS), OGC WMS. Renders NOAA ENC data
 * with traditional paper-chart symbology — the chart look of the original Webflow
 * spot page. Served via Leaflet core's `L.tileLayer.wms` (no extra dependency);
 * the NCDS WMTS endpoint is advertised but does not serve tiles (HTTP 400), and
 * the Esri REST option would need esri-leaflet. Verified 2026-07-17: GetMap
 * returns chart PNGs across our whole territory (Canal, Buzzards Bay, Vineyard
 * Sound, outer Cape). Endpoint isolated here so it's a one-line swap.
 *
 * NOAA charts are public-domain; attribution to the Office of Coast Survey is
 * requested (matches the old site's "© NOAA Office of Coast Survey"). Leaflet's
 * attribution control adds the "Leaflet" credit automatically → "Leaflet | © …".
 */
const NOAA_CHART_WMS = {
  url: 'https://gis.charttools.noaa.gov/arcgis/rest/services/MCS/NOAAChartDisplay/MapServer/exts/MaritimeChartService/WMSServer',
  layers: '0,1,2,3,4,5,6,7,8,9,10,11,12',
  attribution: '&copy; NOAA Office of Coast Survey',
}

/**
 * NAMED fallback (kept, never deleted): plain OSM raster. Used only when the NOAA
 * chart service fails persistently on load — the map must never render as an empty
 * gray grid. Not shown otherwise.
 */
const OSM_FALLBACK = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap',
}

/**
 * Fallback trigger: if this many chart tiles fail within the initial-load window,
 * the government service is treated as down and we swap to OSM. Bounded to the
 * first seconds so a stray tileerror later in a long session doesn't demote a
 * working chart.
 */
const FALLBACK_TILE_ERRORS = 6
const FALLBACK_WINDOW_MS = 8000

/**
 * A pure-CSS teardrop pin via `L.divIcon` — no image URLs, so it sidesteps
 * Leaflet's bundler-broken default icon AND the flaky node_modules PNG imports
 * under Turbopack (which resolved to no usable `.src`). Styling is Phase 8.
 */
const spotIcon = L.divIcon({
  className: 'spot-map-marker',
  html: '<span style="display:block;width:16px;height:16px;background:#2b6cb0;border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 3px rgba(0,0,0,.5)"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 16],
  popupAnchor: [0, -16],
})

/** Coerce a coordinate to a finite number; treat anything else as missing. */
function toCoord(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * XWeather sea-surface-temperature raster, proxied same-origin (the proxy holds
 * the credentials — see app/api/xweather). Painted on its own pane above the
 * chart tiles but below the marker, semi-transparent so the chart reads through.
 * `maxNativeZoom` caps upstream requests (SST is coarse, updates ~6h) and lets
 * Leaflet upscale past it instead of requesting empty high-zoom tiles.
 */
const SST_OVERLAY = {
  url: '/api/xweather/maritime-sst/{z}/{x}/{y}',
  opacity: 0.6,
  maxNativeZoom: 10,
}

export default function SpotMap({
  lat,
  lng,
  name,
  zoom = DEFAULT_ZOOM,
  sstOverlay = false,
}: SpotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const latNum = toCoord(lat)
  const lngNum = toCoord(lng)
  const hasCoords = latNum !== null && lngNum !== null

  useEffect(() => {
    if (latNum === null || lngNum === null || !containerRef.current) return
    // Clamp the requested zoom into the chart-supported band so a spot's own
    // zoomLevel can't land the view on blank/over-zoomed tiles.
    const initialZoom = Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, zoom))
    const map = L.map(containerRef.current, {
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
    }).setView([latNum, lngNum], initialZoom)

    // PRIMARY: NOAA nautical charts.
    const noaa = L.tileLayer.wms(NOAA_CHART_WMS.url, {
      layers: NOAA_CHART_WMS.layers,
      format: 'image/png',
      transparent: true,
      version: '1.3.0',
      attribution: NOAA_CHART_WMS.attribution,
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
    })
    noaa.addTo(map)

    // Resilience: government tile services blip. If the chart layer fails
    // persistently during the initial load, swap to the OSM fallback so the map
    // is never an empty gray grid. Bounded to the initial window; one-shot.
    const startedAt = Date.now()
    let tileErrors = 0
    let fellBack = false
    noaa.on('tileerror', () => {
      if (fellBack || Date.now() - startedAt > FALLBACK_WINDOW_MS) return
      tileErrors += 1
      if (tileErrors < FALLBACK_TILE_ERRORS) return
      fellBack = true
      console.warn(
        '[SpotMap] NOAA chart tiles failing on load — falling back to OSM base layer.',
      )
      map.removeLayer(noaa)
      L.tileLayer(OSM_FALLBACK.url, {
        attribution: OSM_FALLBACK.attribution,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
      }).addTo(map)
    })

    // SST overlay on a dedicated pane (zIndex between base tiles=200 and
    // overlays=400) so it stays above the chart — and above the OSM fallback if
    // that ever swaps in — but under the marker.
    if (sstOverlay) {
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
    }

    L.marker([latNum, lngNum], { icon: spotIcon }).addTo(map).bindPopup(name)

    // Destroy on unmount — React StrictMode double-mounts in dev would otherwise
    // leak map instances / throw "Map container is already initialized".
    return () => {
      map.remove()
    }
  }, [latNum, lngNum, zoom, name, sstOverlay])

  if (!hasCoords) {
    return (
      <div style={{ height: MAP_HEIGHT }}>
        <p>Location not available</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ height: MAP_HEIGHT, width: '100%' }}
      aria-label={`Map showing ${name}`}
    />
  )
}
