import type { Metadata } from 'next'

import { stegaClean } from '@sanity/client/stega'

import {
  SpeciesPostGrid,
  type PostFacet,
  type SpeciesPostItem,
} from '@/components/species/SpeciesPostGrid'
import { sanityFetch } from '@/lib/sanity/client'
import { speciesPostsIndexQuery } from '@/lib/sanity/queries'
import type { SpeciesPostsIndexQueryResult } from '@/sanity.types'

export const revalidate = 3600

export const metadata: Metadata = {
  title: 'Species',
  description:
    'Capt. Mike’s species playbooks for Cape Cod — bonito, albies, stripers and more. Search and filter every guide by species and baitfish.',
}

/** stega-clean a scalar to a plain trimmed string ('' when absent). */
function clean(value: string | null | undefined): string {
  if (typeof value !== 'string') return ''
  const c = stegaClean(value)
  return typeof c === 'string' ? c.trim() : ''
}

/** Resolved, non-null facet refs with a cleaned name (drops nameless items). */
function facets(
  list: SpeciesPostsIndexQueryResult[number]['species'],
): PostFacet[] {
  return (list ?? [])
    .map((f) => (f ? { name: clean(f.name), slug: f.slug ?? null } : null))
    .filter((f): f is PostFacet => Boolean(f && f.name))
}

export default async function SpeciesPage() {
  const rows = (await sanityFetch({
    query: speciesPostsIndexQuery,
    tags: ['speciesPost', 'targetSpecies'],
  })) as SpeciesPostsIndexQueryResult

  const posts: SpeciesPostItem[] = rows.flatMap((r) => {
    const name = clean(r.name)
    const slug = clean(r.slug)
    if (!name || !slug) return []
    return [
      {
        _id: r._id,
        name,
        slug,
        excerpt: clean(r.excerpt),
        species: facets(r.species),
        baitfish: facets(r.baitfish),
      },
    ]
  })

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <header className="space-y-1">
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          Species
        </h1>
        <p className="font-mono text-sm text-header">
          {posts.length} playbooks — search and filter by species or baitfish
        </p>
      </header>

      <SpeciesPostGrid posts={posts} />
    </main>
  )
}
