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
    <main>
      <h1>Spots</h1>
      <p>{spots.length} spots</p>
      {ordered.map(({ region, spots: regionSpots }) => (
        <section key={region.slug ?? region.name}>
          <h2>
            {region.slug ? (
              <Link href={`/regions/${region.slug}`}>{region.name}</Link>
            ) : (
              region.name
            )}{' '}
            ({regionSpots.length})
          </h2>
          {regionSpots.map((spot) => (
            <SpotCard key={spot._id} spot={spot} />
          ))}
        </section>
      ))}
    </main>
  )
}
