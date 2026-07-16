import type { Metadata } from 'next'
import Link from 'next/link'

import { SpotCard, type SpotCardData } from '@/components/SpotCard'
import { sanityFetch } from '@/lib/sanity/client'
import { spotsIndexQuery } from '@/lib/sanity/queries'
import { regionForSpot, type RegionRef } from '@/lib/taxonomy'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Spots',
  description: 'Every fishing spot on Salty Cape, grouped by region.',
}

interface SpotIndexItem extends SpotCardData {
  regionName: string | null
  regionSlug: string | null
}

export default async function SpotsIndexPage() {
  const spots = (await sanityFetch({
    query: spotsIndexQuery,
    tags: ['spot'],
  })) as SpotIndexItem[]

  // Group by region (id-prefix first, ref fallback). The query is already
  // name-sorted, so spots stay name-sorted within each group.
  const groups = new Map<string, { region: RegionRef; spots: SpotIndexItem[] }>()
  for (const spot of spots) {
    const region = regionForSpot(spot.id, spot.regionName, spot.regionSlug)
    const key = region.slug ?? region.name
    const existing = groups.get(key)
    if (existing) existing.spots.push(spot)
    else groups.set(key, { region, spots: [spot] })
  }
  const ordered = [...groups.values()].sort((a, b) =>
    a.region.name.localeCompare(b.region.name),
  )

  return (
    <main className="mx-auto w-full max-w-6xl space-y-10 px-4 py-8">
      <header className="space-y-1">
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          Spots
        </h1>
        <p className="font-mono text-sm text-header">{spots.length} spots</p>
      </header>
      {ordered.map(({ region, spots: regionSpots }) => (
        <section key={region.slug ?? region.name} className="space-y-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-header">
              Region · {regionSpots.length}
            </p>
            <h2 className="font-sans text-2xl font-semibold text-header">
              {region.slug ? (
                <Link
                  href={`/regions/${region.slug}`}
                  className="hover:text-green-dark"
                >
                  {region.name}
                </Link>
              ) : (
                region.name
              )}
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {regionSpots.map((spot) => (
              <SpotCard key={spot._id} spot={spot} />
            ))}
          </div>
        </section>
      ))}
    </main>
  )
}
