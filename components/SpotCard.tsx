import Link from 'next/link'

import { regionForSpot } from '@/lib/taxonomy'

/**
 * Presentational spot card. PURE — no data fetching, typed props only, so
 * Builder.io can reuse it directly. The brand's ambassador; restraint over
 * decoration. Box spec + Inconsolata name / #535c71 id / IBM Plex summary.
 */
export interface SpotCardData {
  _id: string
  name: string | null
  id: string | null
  slug: string | null
  summary: string | null
}

function truncate(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean
}

export function SpotCard({ spot }: { spot: SpotCardData }) {
  const title = spot.name ?? spot.id ?? spot._id
  // Region derived from the id prefix (pure — same as the /spots grouping).
  const region = regionForSpot(spot.id)
  return (
    <article className="box flex flex-col gap-2">
      <h3 className="font-mono text-lg font-semibold leading-snug text-header">
        {spot.slug ? (
          <Link href={`/spots/${spot.slug}`} className="hover:text-green-dark">
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      {spot.id && (
        <code className="font-mono text-xs text-header">{spot.id}</code>
      )}
      {spot.summary && (
        <p className="text-sm leading-relaxed">{truncate(spot.summary)}</p>
      )}
      {region.slug && (
        <span className="mt-1 inline-block self-start rounded-[5px] bg-body px-2 py-0.5 font-mono text-xs">
          {region.name}
        </span>
      )}
    </article>
  )
}
