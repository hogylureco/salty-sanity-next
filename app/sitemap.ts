import type { MetadataRoute } from 'next'

import { client } from '@/lib/sanity/client'
import { sitemapSpotsQuery, sitemapTaxonomyQuery } from '@/lib/sanity/queries'
import {
  ALL_TAXONOMY_TYPES,
  SEGMENT_BY_TYPE,
  SITE_URL,
  TAXONOMIES,
} from '@/lib/taxonomy'

/**
 * The ONE place in the repo that overrides the Phase 1 dev-drafts default: a
 * sitemap must list only PUBLISHED URLs. In dev the default client reads the
 * `drafts` perspective, which would emit draft-only paths that 404 in
 * production — worse than no sitemap. So we force `published` here explicitly.
 */
const publishedClient = client.withConfig({
  perspective: 'published',
  useCdn: true,
})

export const revalidate = 3600

type SlugRow = { slug: string | null; _updatedAt: string }
type TaxonomyRow = SlugRow & { _type: string }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [spots, taxonomy] = await Promise.all([
    publishedClient.fetch(sitemapSpotsQuery) as Promise<SlugRow[]>,
    publishedClient.fetch(sitemapTaxonomyQuery, {
      types: ALL_TAXONOMY_TYPES,
    }) as Promise<TaxonomyRow[]>,
  ])

  const now = new Date()
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now },
    { url: `${SITE_URL}/spots`, lastModified: now },
    ...TAXONOMIES.map((t) => ({
      url: `${SITE_URL}/${t.segment}`,
      lastModified: now,
    })),
  ]

  const spotRoutes: MetadataRoute.Sitemap = spots
    .filter((s) => s.slug)
    .map((s) => ({
      url: `${SITE_URL}/spots/${s.slug}`,
      lastModified: new Date(s._updatedAt),
    }))

  // structure + structureType both map to /structures, so dedupe by URL.
  const seen = new Set<string>()
  const taxonomyRoutes: MetadataRoute.Sitemap = taxonomy
    .filter((t) => t.slug && SEGMENT_BY_TYPE[t._type])
    .map((t) => ({
      url: `${SITE_URL}/${SEGMENT_BY_TYPE[t._type]}/${t.slug}`,
      lastModified: new Date(t._updatedAt),
    }))
    .filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)))

  return [...staticRoutes, ...spotRoutes, ...taxonomyRoutes]
}
