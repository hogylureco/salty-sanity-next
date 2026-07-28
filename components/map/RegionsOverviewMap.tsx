'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { useRouter } from 'next/navigation'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { WORKER_URL } from '@/lib/worker'

import { type RegionsOverviewMapProps } from './mapConstants'

/** Same overview zoom band + tile setup as SpotsOverviewMap. */
const MIN_ZOOM = 7
const MAX_ZOOM = 16
const OVERVIEW_HEIGHT = 480
const NOAA_PAPER_TILES = `${WORKER_URL}/noaa-chart/paper/{z}/{x}/{y}`
const SEAMARK_TILES = `${WORKER_URL}/openseamap/{z}/{x}/{y}`
const NOAA_ATTRIBUTION =
  'Chart data &copy; NOAA Office of Coast Survey — not for navigation'
const DETAIL_TILE_SIZE = 128
const DETAIL_ZOOM_OFFSET = 1

/** Coloured circular marker, one divIcon per region colour (cached). */
const iconCache = new Map<string, L.DivIcon>()
function circleIcon(color: string): L.DivIcon {
  const hit = iconCache.get(color)
  if (hit) return hit
  const icon = L.divIcon({
    className: 'region-map-marker',
    html: `<span style="display:block;width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 0 3px rgba(0,0,0,.5)"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
  iconCache.set(color, icon)
  return icon
}

export default function RegionsOverviewMap({
  markers,
  legend,
}: RegionsOverviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const groupsRef = useRef<Map<string, L.LayerGroup>>(new Map())
  const router = useRouter()
  // Regions toggled OFF (hidden). Empty = all shown.
  const [hidden, setHidden] = useState<Set<string>>(new Set())

  const markerKey = useMemo(() => markers.map((m) => m.id).join(','), [markers])

  // Build the map + one layer group per region once.
  useEffect(() => {
    if (!containerRef.current) return
    const map = L.map(containerRef.current, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      scrollWheelZoom: false,
    })
    mapRef.current = map
    map.attributionControl.setPosition('bottomleft')

    L.tileLayer(NOAA_PAPER_TILES, {
      attribution: NOAA_ATTRIBUTION,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      tileSize: DETAIL_TILE_SIZE,
      zoomOffset: DETAIL_ZOOM_OFFSET,
    }).addTo(map)
    map.createPane('seamarks')
    const pane = map.getPane('seamarks')
    if (pane) pane.style.zIndex = '350'
    L.tileLayer(SEAMARK_TILES, {
      pane: 'seamarks',
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      tileSize: DETAIL_TILE_SIZE,
      zoomOffset: DETAIL_ZOOM_OFFSET,
      maxNativeZoom: 18,
    }).addTo(map)

    const groups = new Map<string, L.LayerGroup>()
    for (const m of markers) {
      const marker = L.marker([m.lat, m.lng], { icon: circleIcon(m.color) })
      marker.bindTooltip(m.name, { direction: 'top', offset: [0, -8] })
      if (m.slug) {
        const slug = m.slug
        marker.on('click', () => router.push(`/spots/${slug}`))
      }
      let group = groups.get(m.regionSlug)
      if (!group) {
        group = L.layerGroup()
        groups.set(m.regionSlug, group)
      }
      group.addLayer(marker)
    }
    for (const group of groups.values()) group.addTo(map)
    groupsRef.current = groups

    if (markers.length > 0) {
      map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng])), {
        padding: [40, 40],
        maxZoom: 12,
      })
    } else {
      map.setView([41.6, -70.3], MIN_ZOOM)
    }

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      groupsRef.current = new Map()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, router])

  // Apply the hidden-set: add/remove each region group, then refit to shown.
  useEffect(() => {
    const map = mapRef.current
    const groups = groupsRef.current
    if (!map) return
    for (const [slug, group] of groups) {
      if (hidden.has(slug)) map.removeLayer(group)
      else group.addTo(map)
    }
    const shown = markers.filter((m) => !hidden.has(m.regionSlug))
    if (shown.length > 0) {
      map.fitBounds(L.latLngBounds(shown.map((m) => [m.lat, m.lng])), {
        padding: [40, 40],
        maxZoom: 12,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden, markerKey])

  const toggle = (slug: string) => {
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  return (
    <div>
      <div className="relative">
        <div
          ref={containerRef}
          style={{ height: OVERVIEW_HEIGHT, width: '100%' }}
          aria-label="Map of inshore boat spots, coloured by region"
        />
      </div>

      {/* Legend below the map — each row is also a show/hide toggle. */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {legend.map((r) => {
          const off = hidden.has(r.slug)
          return (
            <li key={r.slug}>
              <button
                type="button"
                onClick={() => toggle(r.slug)}
                aria-pressed={!off}
                className={`flex items-center gap-2 rounded-full px-2.5 py-1 font-mono text-xs transition-colors ring-1 ${
                  off
                    ? 'text-header/50 ring-body'
                    : 'text-header ring-body hover:ring-header/30'
                }`}
              >
                <span
                  aria-hidden
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    background: r.color,
                    border: '2px solid #fff',
                    boxShadow: '0 0 2px rgba(0,0,0,.4)',
                    opacity: off ? 0.35 : 1,
                  }}
                />
                <span className={off ? 'line-through' : ''}>{r.name}</span>
                <span className="text-header/60">{r.count}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
