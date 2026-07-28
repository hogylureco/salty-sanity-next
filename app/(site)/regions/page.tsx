import type { Metadata } from 'next'
import Link from 'next/link'

import { RegionsOverviewMapLoader } from '@/components/map/RegionsOverviewMapLoader'
import {
  StaticBoundsThumb,
  type ThumbSpot,
} from '@/components/map/StaticBoundsThumb'
import {
  type RegionLegendItem,
  type RegionMarker,
} from '@/components/map/mapConstants'
import { sanityFetch } from '@/lib/sanity/client'
import { fsSpotsQuery } from '@/lib/sanity/queries'
import { regionColor, regionOrder } from '@/lib/regionColors'
import { regionForSpot } from '@/lib/taxonomy'
import type { FsSpotsQueryResult } from '@/sanity.types'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Regions',
  description:
    'Every Salty Cape region on one chart — inshore boat spots colour-coded by region — with a per-region breakdown showing where each one’s spots sit.',
}

/** Finite-number coord guard (a null/NaN coord must not place a marker at 0,0). */
function coord(v: number | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Per-region rollup built from the FS spots. */
interface RegionAgg {
  slug: string
  name: string
  color: string
  /** All FS spots / ramps in the region (with or without coordinates). */
  total: number
  /** Coordinate-bearing spots — feed the thumbnail + the overview markers. */
  thumbSpots: ThumbSpot[]
}

export default async function RegionsIndexPage() {
  const spots = (await sanityFetch({
    query: fsSpotsQuery,
    tags: ['spot'],
  })) as FsSpotsQueryResult

  const bySlug = new Map<string, RegionAgg>()
  const markers: RegionMarker[] = []

  for (const s of spots) {
    const region = regionForSpot(s.id)
    // Skip the "Unknown region" bucket — no page, no colour slot.
    if (!region.slug) continue
    const color = regionColor(region.slug)

    let agg = bySlug.get(region.slug)
    if (!agg) {
      agg = { slug: region.slug, name: region.name, color, total: 0, thumbSpots: [] }
      bySlug.set(region.slug, agg)
    }
    agg.total += 1

    const lat = coord(s.latitude)
    const lng = coord(s.longitude)
    if (lat !== null && lng !== null) {
      agg.thumbSpots.push({ lat, lng })
      markers.push({
        id: s._id,
        name: s.name ?? s.id ?? s._id,
        slug: s.slug,
        lat,
        lng,
        regionSlug: region.slug,
        color,
      })
    }
  }

  // Fixed palette order (colour follows the region, never its rank).
  const regions = [...bySlug.values()].sort(
    (a, b) => regionOrder(a.slug) - regionOrder(b.slug),
  )
  const legend: RegionLegendItem[] = regions
    .filter((r) => r.thumbSpots.length > 0)
    .map((r) => ({ slug: r.slug, name: r.name, color: r.color, count: r.thumbSpots.length }))

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          Regions
        </h1>
        <p className="font-mono text-sm text-header">
          {markers.length} inshore boat spots across {regions.length} regions
        </p>
      </header>

      {/* Overview chart: every spot, coloured by region, with a legend below
          that toggles each region. Client-only (Leaflet) via the loader. */}
      {markers.length > 0 && (
        <RegionsOverviewMapLoader markers={markers} legend={legend} />
      )}

      <p className="max-w-[70ch] text-sm leading-relaxed text-ink">
        Each colour is a region — tap a legend chip to isolate it on the chart.
        Below, every region is broken out with a thumbnail framed to its own
        spots. Charts are for reference only — not for navigation.
      </p>

      {/* Region grid: a bounds-fit thumbnail per region. */}
      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {regions.map((r) => (
          <Link
            key={r.slug}
            href={`/regions/${r.slug}`}
            className="box group overflow-hidden p-0 no-underline transition-shadow hover:shadow-md"
          >
            <StaticBoundsThumb spots={r.thumbSpots} color={r.color} />
            <div className="flex items-center gap-2 px-4 py-3">
              <span
                aria-hidden
                className="shrink-0 rounded-full"
                style={{
                  width: 12,
                  height: 12,
                  background: r.color,
                  border: '2px solid #fff',
                  boxShadow: '0 0 2px rgba(0,0,0,.4)',
                }}
              />
              <span className="font-mono text-base font-semibold text-header group-hover:text-green-dark">
                {r.name}
              </span>
              <span className="ml-auto font-mono text-xs text-header/60">
                {r.total} {r.total === 1 ? 'spot' : 'spots'}
              </span>
            </div>
          </Link>
        ))}
      </section>
    </main>
  )
}
