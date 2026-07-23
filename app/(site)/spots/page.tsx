
import type { Metadata } from 'next'

import { SpotsOverviewMapLoader } from '@/components/map/SpotsOverviewMapLoader'
import { type OverviewMarker } from '@/components/map/mapConstants'
import {
  FilterableSpotGrid,
  type FilterableSpotItem,
} from '@/components/spot/FilterableSpotGrid'
import { sanityFetch } from '@/lib/sanity/client'
import { fsSpotsQuery } from '@/lib/sanity/queries'
import { regionForSpot } from '@/lib/taxonomy'
import type { FsSpotsQueryResult } from '@/sanity.types'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Spots',
  description:
    'A map of Salty Cape inshore boat spots and boat ramps, plus a filterable index by region, structure, and species.',
}

/** Finite-number coord guard (a null/NaN coord must not place a marker at 0,0). */
function coord(v: number | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Non-empty resolved names off a weak-ref list (dangling items already dropped). */
function names(list: Array<{ name: string | null } | null> | null): string[] {
  return (list ?? [])
    .map((x) => x?.name)
    .filter((n): n is string => Boolean(n))
}

export default async function SpotsIndexPage() {
  const spots = (await sanityFetch({
    query: fsSpotsQuery,
    tags: ['spot'],
  })) as FsSpotsQueryResult

  // Map markers: every FS spot or boat ramp that has coordinates (offshore too).
  const markers: OverviewMarker[] = spots.flatMap((s) => {
    const lat = coord(s.latitude)
    const lng = coord(s.longitude)
    if (lat === null || lng === null) return []
    return [
      {
        id: s._id,
        name: s.name ?? s.id ?? s._id,
        slug: s.slug,
        lat,
        lng,
        kind: s.kind,
      },
    ]
  })

  // Grid: inshore boat spots that have a page (slug), with facets for filtering
  // and coordinates for the static chart thumbnail.
  const gridItems: FilterableSpotItem[] = spots
    .filter((s) => s.kind === 'spot' && Boolean(s.slug))
    .map((s) => ({
      _id: s._id,
      name: s.name,
      id: s.id,
      slug: s.slug,
      lat: coord(s.latitude),
      lng: coord(s.longitude),
      regionName: regionForSpot(s.id).name,
      structures: names(s.structures),
      species: names(s.species),
    }))

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          Spots
        </h1>
        <p className="font-mono text-sm text-header">
          {gridItems.length} inshore boat spots
        </p>
      </header>

      {/* Overview chart: FS spots + boat ramps, with a Spots / Boat Ramps / All
          filter. Client-only (Leaflet) via the loader; the page stays static. */}
      {markers.length > 0 && <SpotsOverviewMapLoader markers={markers} />}

      {/* How to use the chart. */}
      <div className="max-w-[70ch] space-y-2 text-sm leading-relaxed text-ink">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
          Using this chart
        </h2>
        <p>
          The chart plots every inshore boat spot and boat ramp with known
          coordinates across the Cape — offshore marks included. Use the{' '}
          <strong>Inshore Boat Spots</strong>, <strong>Boat Ramps</strong>, and{' '}
          <strong>All</strong> buttons to filter what&apos;s shown; the map
          re-frames to fit the current selection.
        </p>
        <p>
          Navy teardrops are inshore boat spots; amber squares are boat ramps.
          Zoom in once and each marker labels itself. Click a spot to open its
          full page — tides, the nautical chart, gear, and playbooks. Scroll-zoom
          is off so the page still scrolls normally; use the{' '}
          <span className="font-mono">+ / −</span> controls or pinch to zoom, and
          drag to pan. Charts are for reference only — not for navigation.
        </p>
        <p className="text-header">
          Below, browse the inshore boat spots as a grid and narrow it by region,
          structure, or target species.
        </p>
      </div>

      <FilterableSpotGrid items={gridItems} />
    </main>
  )
}
