'use client'

import { useEffect, useRef } from 'react'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { MAP_HEIGHT, type SpotMapProps } from './mapConstants'

/**
 * Base tile layer, isolated so the NOAA Chart Display WMS / OpenSeaMap overlays
 * (a later phase) are a one-line swap.
 */
const TILE_LAYER = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19,
}

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

export default function SpotMap({ lat, lng, name, zoom = 13 }: SpotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const latNum = toCoord(lat)
  const lngNum = toCoord(lng)
  const hasCoords = latNum !== null && lngNum !== null

  useEffect(() => {
    if (latNum === null || lngNum === null || !containerRef.current) return
    const map = L.map(containerRef.current).setView([latNum, lngNum], zoom)
    L.tileLayer(TILE_LAYER.url, {
      attribution: TILE_LAYER.attribution,
      maxZoom: TILE_LAYER.maxZoom,
    }).addTo(map)
    L.marker([latNum, lngNum], { icon: spotIcon }).addTo(map).bindPopup(name)
    // Destroy on unmount — React StrictMode double-mounts in dev would otherwise
    // leak map instances / throw "Map container is already initialized".
    return () => {
      map.remove()
    }
  }, [latNum, lngNum, zoom, name])

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
