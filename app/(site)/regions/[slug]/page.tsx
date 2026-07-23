import Link from 'next/link'
import { notFound } from 'next/navigation'

import { SpotsOverviewMapLoader } from '@/components/map/SpotsOverviewMapLoader'
import { type OverviewMarker } from '@/components/map/mapConstants'
import {
  SpotChartCard,
  type SpotChartCardData,
} from '@/components/spot/SpotChartCard'
import {
  generateTaxonomyMetadata,
  generateTaxonomyStaticParams,
} from '@/components/taxonomy/TaxonomyDetail'
import { sanityFetch } from '@/lib/sanity/client'
import { fsSpotsQuery, taxonomyDocBySlugQuery } from '@/lib/sanity/queries'
import { regionForSpot, regionNameForSlug } from '@/lib/taxonomy'
import type {
  FsSpotsQueryResult,
  TaxonomyDocBySlugQueryResult,
} from '@/sanity.types'

const TYPES = ['region']

export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return generateTaxonomyStaticParams(TYPES)
}

export function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  return generateTaxonomyMetadata(TYPES, 'regions', props.params)
}

/** Finite-number coord guard. */
function coord(v: number | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export default async function RegionPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [region, allSpots] = await Promise.all([
    sanityFetch({
      query: taxonomyDocBySlugQuery,
      params: { types: TYPES, slug },
      tags: ['region', `region:${slug}`],
    }) as Promise<TaxonomyDocBySlugQueryResult>,
    sanityFetch({
      query: fsSpotsQuery,
      tags: ['spot'],
    }) as Promise<FsSpotsQueryResult>,
  ])

  // Spots belong to a region by id-prefix (the primary source; the region ref
  // dangles for most). Includes this region's boat ramps — their id carries the
  // region in the 2nd segment (see regionForSpot).
  const inRegion = allSpots.filter((s) => regionForSpot(s.id).slug === slug)

  const regionName = regionNameForSlug(slug) ?? region?.name ?? null
  if (!regionName && inRegion.length === 0) notFound()
  const title = regionName ?? 'Region'

  // Chart markers: every FS spot / boat ramp in the region that has coordinates.
  const markers: OverviewMarker[] = inRegion.flatMap((s) => {
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

  // Grid: this region's inshore boat spots that have a page.
  const gridItems: SpotChartCardData[] = inRegion
    .filter((s) => s.kind === 'spot' && Boolean(s.slug))
    .map((s) => ({
      _id: s._id,
      name: s.name,
      id: s.id,
      slug: s.slug,
      lat: coord(s.latitude),
      lng: coord(s.longitude),
    }))

  // Sidebar: every OTHER region that has inshore boat spots.
  const regionsWithSpots = new Map<string, string>()
  for (const s of allSpots) {
    if (s.kind !== 'spot') continue
    const r = regionForSpot(s.id)
    if (r.slug) regionsWithSpots.set(r.slug, r.name)
  }
  const otherRegions = [...regionsWithSpots.entries()]
    .filter(([rSlug]) => rSlug !== slug)
    .map(([rSlug, rName]) => ({ slug: rSlug, name: rName }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <p className="font-mono text-xs uppercase tracking-wider text-header">
        <Link href="/regions" className="hover:text-green-dark">
          Regions
        </Link>
        {' / '}
        {title}
      </p>

      <header className="space-y-1">
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          {title}
        </h1>
        <p className="font-mono text-sm text-header">
          {gridItems.length} inshore boat spots
        </p>
      </header>

      {/* Chart: all of the region's FS spots (+ boat ramps) — the same overview
          map as /spots. Client-only via the loader; the page stays static. */}
      {markers.length > 0 && <SpotsOverviewMapLoader markers={markers} />}

      {/* Grid of spots + a sidebar of other regions on the right. */}
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start lg:gap-8">
        <div className="min-w-0">
          {gridItems.length === 0 ? (
            <p className="text-sm text-[#535c71]">
              No inshore boat spots in this region yet.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {gridItems.map((item) => (
                <SpotChartCard key={item._id} item={item} showRegion={false} />
              ))}
            </div>
          )}
        </div>

        <aside className="mt-8 lg:mt-0">
          <div className="box lg:sticky lg:top-28">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
              Other Regions
            </h2>
            <hr className="my-3 border-body" />
            {otherRegions.length === 0 ? (
              <p className="text-sm text-[#535c71]">No other regions.</p>
            ) : (
              <ul className="space-y-1.5">
                {otherRegions.map((r) => (
                  <li key={r.slug} className="text-sm">
                    <Link
                      href={`/regions/${r.slug}`}
                      className="text-green-dark hover:underline"
                    >
                      {r.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </main>
  )
}
