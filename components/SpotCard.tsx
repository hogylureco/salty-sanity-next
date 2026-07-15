import Link from 'next/link'

/**
 * Presentational spot card. PURE — no data fetching, typed props only, so
 * Builder.io can reuse it directly in Phase 7. Styling is Phase 8.
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
  return (
    <article>
      <h3>
        {spot.slug ? <Link href={`/spots/${spot.slug}`}>{title}</Link> : title}
      </h3>
      {spot.id && <code>{spot.id}</code>}
      {spot.summary && <p>{truncate(spot.summary)}</p>}
    </article>
  )
}
