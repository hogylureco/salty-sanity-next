'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

import { useRouter } from 'next/navigation'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { WORKER_URL } from '@/lib/worker'

import { type SpotsOverviewMapProps } from './mapConstants'

/** Overview zoom band. Wider (lower min) than a single-spot view so the whole
 *  region — including offshore markers — fits. */
const MIN_ZOOM = 7
const MAX_ZOOM = 16
const OVERVIEW_HEIGHT = 480

const NOAA_PAPER_TILES = `${WORKER_URL}/noaa-chart/paper/{z}/{x}/{y}`
const SEAMARK_TILES = `${WORKER_URL}/openseamap/{z}/{x}/{y}`
const NOAA_ATTRIBUTION =
  'Chart data &copy; NOAA Office of Coast Survey — not for navigation'

// "Inshore detail earlier" trick: request tiles ONE zoom level deeper than the
// display zoom (zoomOffset +1) and render them at half size (tileSize 128) so
// the geographic scale stays correct but a more detailed chart band shows up a
// zoom sooner than the plain 256px/offset-0 layer would.
const DETAIL_TILE_SIZE = 128
const DETAIL_ZOOM_OFFSET = 1

const NAVY = '#2b6cb0'
const AMBER = '#e08a1e'
const LABEL_FONT = 'var(--font-sans), system-ui, sans-serif'

// Featured/"inshore boat spot" marker: navy teardrop (matches the single-spot
// pin). Boat-ramp marker: amber square — a different colour AND shape so the
// two read apart at a glance (colour alone fails colourblind users).
const spotIcon = L.divIcon({
  className: 'spot-map-marker',
  html: `<span style="display:block;width:14px;height:14px;background:${NAVY};border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 3px rgba(0,0,0,.5)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 14],
})
const rampIcon = L.divIcon({
  className: 'spot-map-marker',
  html: `<span style="display:block;width:12px;height:12px;background:${AMBER};border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,.5)"></span>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
})

type Filter = 'all' | 'spot' | 'ramp'

interface Tracked {
  marker: L.Marker
  kind: 'spot' | 'ramp'
  name: string
  /** Route slug, or null — drives whether the label is clickable. */
  slug: string | null
}

export default function SpotsOverviewMap({ markers }: SpotsOverviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const groupsRef = useRef<{ spot: L.LayerGroup; ramp: L.LayerGroup } | null>(
    null,
  )
  const trackedRef = useRef<Tracked[]>([])
  // Labels turn on one zoom-in past the initial fit ("click in once"). Captured
  // after the first fitBounds and held fixed so filtering doesn't move the bar.
  const labelZoomRef = useRef<number>(Infinity)
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('all')
  // Whether marker names are currently shown (zoom ≥ threshold). Drives the
  // "zoom in" hint, which is only useful while the names are still hidden.
  const [namesVisible, setNamesVisible] = useState(false)

  const markerKey = markers.map((m) => m.id).join(',')

  // Bind/unbind permanent labels based on the current zoom vs the threshold.
  function syncLabels(map: L.Map) {
    const show = map.getZoom() >= labelZoomRef.current
    setNamesVisible(show)
    for (const t of trackedRef.current) {
      const onMap = map.hasLayer(t.marker)
      const bound = t.marker.getTooltip() != null
      if (show && onMap && !bound) {
        t.marker.bindTooltip(labelEl(t.name, t.kind), {
          permanent: true,
          // Interactive so a click on the LABEL routes to the marker's click
          // handler (navigation), same as clicking the icon. Only when the spot
          // has a page — a non-navigable ramp label shouldn't look clickable.
          interactive: t.slug != null,
          direction: 'top',
          offset: [0, t.kind === 'spot' ? -14 : -8],
          className: 'spot-label',
        })
      } else if ((!show || !onMap) && bound) {
        t.marker.unbindTooltip()
      }
    }
  }

  // Build the map + both marker groups once.
  useEffect(() => {
    if (!containerRef.current) return
    const map = L.map(containerRef.current, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      scrollWheelZoom: false, // don't hijack page scroll on a tall map
    })
    mapRef.current = map
    // Free the bottom-right corner for the "zoom in" hint.
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

    const tracked: Tracked[] = []
    const build = (kind: 'spot' | 'ramp') => {
      const group = L.layerGroup()
      for (const m of markers.filter((x) => x.kind === kind)) {
        const marker = L.marker([m.lat, m.lng], {
          icon: kind === 'spot' ? spotIcon : rampIcon,
        })
        if (m.slug) {
          const slug = m.slug
          marker.on('click', () => router.push(`/spots/${slug}`))
        }
        group.addLayer(marker)
        tracked.push({ marker, kind, name: m.name, slug: m.slug })
      }
      return group
    }
    groupsRef.current = { spot: build('spot'), ramp: build('ramp') }
    trackedRef.current = tracked

    // Initial view: fit all markers, then set the label threshold one zoom in.
    groupsRef.current.spot.addTo(map)
    groupsRef.current.ramp.addTo(map)
    if (markers.length > 0) {
      map.fitBounds(L.latLngBounds(markers.map((m) => [m.lat, m.lng])), {
        padding: [40, 40],
        maxZoom: 12,
      })
    } else {
      map.setView([41.6, -70.3], MIN_ZOOM)
    }
    labelZoomRef.current = map.getZoom() + 1
    map.on('zoomend', () => syncLabels(map))
    syncLabels(map)

    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(containerRef.current)

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      groupsRef.current = null
      trackedRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markerKey, router])

  // Apply the active filter: add/remove the two groups, refit, re-sync labels.
  useEffect(() => {
    const map = mapRef.current
    const groups = groupsRef.current
    if (!map || !groups) return
    const show = { spot: filter !== 'ramp', ramp: filter !== 'spot' }
    for (const kind of ['spot', 'ramp'] as const) {
      if (show[kind]) groups[kind].addTo(map)
      else map.removeLayer(groups[kind])
    }
    const shown = markers.filter((m) => show[m.kind])
    if (shown.length > 0) {
      map.fitBounds(L.latLngBounds(shown.map((m) => [m.lat, m.lng])), {
        padding: [40, 40],
        maxZoom: 12,
      })
    }
    syncLabels(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, markerKey])

  const counts = {
    spot: markers.filter((m) => m.kind === 'spot').length,
    ramp: markers.filter((m) => m.kind === 'ramp').length,
  }

  return (
    <div>
      <div
        className="mb-2 flex flex-wrap gap-2"
        role="group"
        aria-label="Map filter"
      >
        <FilterButton active={filter === 'all'} onClick={() => setFilter('all')}>
          All ({counts.spot + counts.ramp})
        </FilterButton>
        <FilterButton
          active={filter === 'spot'}
          onClick={() => setFilter('spot')}
        >
          Inshore Boat Spots ({counts.spot})
        </FilterButton>
        <FilterButton
          active={filter === 'ramp'}
          onClick={() => setFilter('ramp')}
        >
          Boat Ramps ({counts.ramp})
        </FilterButton>
      </div>
      <div className="relative">
        <div
          ref={containerRef}
          style={{ height: OVERVIEW_HEIGHT, width: '100%' }}
          aria-label="Map of inshore boat spots and boat ramps"
        />
        {!namesVisible && (
          <div className="pointer-events-none absolute bottom-2 right-2 z-[1000] rounded-[5px] bg-box/90 px-2.5 py-1 font-mono text-xs font-semibold text-header shadow ring-1 ring-body backdrop-blur">
            Zoom in to see spot names
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-header">
        <LegendKey color={NAVY} teardrop label="Inshore boat spot" />
        <LegendKey color={AMBER} label="Boat ramp" />
        <span className="text-header/70">Zoom in once to label the markers.</span>
      </div>
    </div>
  )
}

function LegendKey({
  color,
  teardrop,
  label,
}: {
  color: string
  teardrop?: boolean
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: teardrop ? 11 : 10,
          height: teardrop ? 11 : 10,
          background: color,
          border: '2px solid #fff',
          borderRadius: teardrop ? '50% 50% 50% 0' : 0,
          transform: teardrop ? 'rotate(-45deg)' : undefined,
          boxShadow: '0 0 2px rgba(0,0,0,.5)',
        }}
      />
      {label}
    </span>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3 py-1 font-mono text-xs font-semibold transition-colors ${
        active
          ? 'bg-box text-red-dark ring-2 ring-red-dark'
          : 'text-header ring-1 ring-body hover:text-ink hover:ring-header/30'
      }`}
    >
      {children}
    </button>
  )
}

/**
 * Permanent-label chip — same formatting as the single-spot chart's label
 * (navy plate, white DM-Sans-equivalent text, `spot-label` strips Leaflet's
 * tooltip chrome). Boat ramps use the amber marker colour to stay consistent
 * with their pin. textContent (never innerHTML) so a name can't inject markup.
 */
function labelEl(name: string, kind: 'spot' | 'ramp'): HTMLElement {
  const chip = document.createElement('span')
  chip.textContent = name
  const bg =
    kind === 'spot' ? 'rgba(43, 108, 176, 0.92)' : 'rgba(166, 95, 16, 0.95)'
  chip.style.cssText =
    `display:inline-block;font-family:${LABEL_FONT};background:${bg};` +
    'color:#fff;font-size:0.75rem;font-weight:600;padding:2px 7px;border-radius:5px;' +
    'box-shadow:0 1px 3px rgba(0,0,0,.35)'
  return chip
}
