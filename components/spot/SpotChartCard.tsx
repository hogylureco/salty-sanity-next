import Link from 'next/link'

import { StaticChartThumb } from '@/components/map/StaticChartThumb'

/**
 * Spot card fronted by a static NOAA-chart thumbnail (no Leaflet — lightweight).
 * Shows the name (linked), coordinates, and optionally the region chip. No
 * summary. Shared by the /spots grid and the region page grid.
 */
export interface SpotChartCardData {
  _id: string
  name: string | null
  id: string | null
  slug: string | null
  lat: number | null
  lng: number | null
  regionName?: string | null
}

export function SpotChartCard({
  item,
  showRegion = true,
}: {
  item: SpotChartCardData
  showRegion?: boolean
}) {
  const title = item.name ?? item.id ?? item._id
  const hasCoords = item.lat != null && item.lng != null
  return (
    <article className="box flex flex-col overflow-hidden p-0">
      {/* The chart thumbnail is clickable — it links to the spot page (the image
          is aria-hidden, so the link carries the accessible name). */}
      {item.slug ? (
        <Link
          href={`/spots/${item.slug}`}
          aria-label={title}
          className="block transition-opacity hover:opacity-90"
        >
          <StaticChartThumb lat={item.lat} lng={item.lng} />
        </Link>
      ) : (
        <StaticChartThumb lat={item.lat} lng={item.lng} />
      )}
      <div className="flex flex-col gap-1.5 p-4">
        <h3 className="font-mono text-lg font-semibold leading-snug text-header">
          {item.slug ? (
            <Link href={`/spots/${item.slug}`} className="hover:text-green-dark">
              {title}
            </Link>
          ) : (
            title
          )}
        </h3>
        {hasCoords && (
          <p className="font-mono text-xs text-header">
            {item.lat!.toFixed(5)}, {item.lng!.toFixed(5)}
          </p>
        )}
        {showRegion && item.regionName && (
          <span className="mt-0.5 self-start rounded-[5px] bg-body px-2 py-0.5 font-mono text-xs">
            {item.regionName}
          </span>
        )}
      </div>
    </article>
  )
}
