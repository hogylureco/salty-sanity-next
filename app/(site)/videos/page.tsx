import type { Metadata } from 'next'

import {
  FilterableVideoGrid,
  type FilterVideo,
  type VideoFacetGroup,
} from '@/components/video/FilterableVideoGrid'
import { sanityFetch } from '@/lib/sanity/client'
import { videosIndexQuery } from '@/lib/sanity/queries'
import { formatVideoCategory, formatVideoDate, youtubeThumb } from '@/lib/video'
import type { VideosIndexQueryResult } from '@/sanity.types'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Videos',
  description:
    'Every Salty Cape fishing video — tactics, spots, and gear, on the water. Filter by species, gear, technique, structure, region, and season.',
}

/** The facet order/labels; the actual display order is sorted by option count. */
const FACET_DEFS: Array<{ key: string; label: string }> = [
  { key: 'species', label: 'Species' },
  { key: 'gearCategories', label: 'Gear Category' },
  { key: 'techniques', label: 'Technique' },
  { key: 'structures', label: 'Structure' },
  { key: 'region', label: 'Region' },
  { key: 'seasons', label: 'Season' },
  { key: 'category', label: 'Category' },
]

/** Dedupe + drop nulls from a resolved-name array. */
function names(list: Array<string | null> | null): string[] {
  return [...new Set((list ?? []).filter((n): n is string => Boolean(n)))]
}

export default async function VideosIndexPage() {
  const videos = (await sanityFetch({
    query: videosIndexQuery,
    tags: ['video'],
  })) as VideosIndexQueryResult

  // Build each video's card props + per-facet values.
  const items: FilterVideo[] = videos.flatMap((v) => {
    if (!v.slug) return []
    const category = formatVideoCategory(v.videoCategory)
    return [
      {
        _id: v._id,
        title: v.title ?? 'Untitled video',
        date: formatVideoDate(v.videoFilmDate),
        regionName: v.region?.name ?? null,
        regionSlug: v.region?.slug ?? null,
        thumbnailUrl: youtubeThumb(v.videoID),
        href: `/videos/${v.slug}`,
        facets: {
          species: names(v.species),
          gearCategories: names(v.gearCategories),
          techniques: names(v.techniques),
          structures: names(v.structures),
          region: v.region?.name ? [v.region.name] : [],
          seasons: names(v.seasons),
          category: category ? [category] : [],
        },
      },
    ]
  })

  // One option list per facet; facets are ordered by how many distinct values
  // they hold (most first → the first is rendered as the scrollbox).
  const facetGroups: VideoFacetGroup[] = FACET_DEFS.map(({ key, label }) => ({
    key,
    label,
    options: [...new Set(items.flatMap((i) => i.facets[key]))].sort((a, b) =>
      a.localeCompare(b),
    ),
  }))
    .filter((g) => g.options.length > 0)
    .sort((a, b) => b.options.length - a.options.length)

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          Videos
        </h1>
        <p className="font-mono text-sm text-header">{items.length} videos</p>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-[#535c71]">No videos yet.</p>
      ) : (
        <FilterableVideoGrid videos={items} facetGroups={facetGroups} />
      )}
    </main>
  )
}
