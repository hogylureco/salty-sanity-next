'use client'

import { useEffect, useRef } from 'react'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIconUrl from 'leaflet/dist/images/marker-icon.png'
import markerIcon2xUrl from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png'

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
 * Explicit icon, built from bundled PNG URLs. Passing it per-marker bypasses
 * Leaflet's default icon, whose relative URLs break under bundlers (the classic
 * broken-image marker).
 */
const spotIcon = L.icon({
  iconUrl: markerIconUrl.src,
  iconRetinaUrl: markerIcon2xUrl.src,
  shadowUrl: markerShadowUrl.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
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
