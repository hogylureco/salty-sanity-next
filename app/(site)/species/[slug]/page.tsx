import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
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
import { breadcrumbList } from '@/lib/jsonld'
import { sanityFetch } from '@/lib/sanity/client'
import {
  postsBySpeciesQuery,
  spotsBySpeciesQuery,
  taxonomyDocBySlugQuery,
} from '@/lib/sanity/queries'
import { bothIdForms, regionForSpot } from '@/lib/taxonomy'
import type {
  PostsBySpeciesQueryResult,
  SpotsBySpeciesQueryResult,
  TaxonomyDocBySlugQueryResult,
} from '@/sanity.types'

const TYPES = ['targetSpecies']
const SEGMENT = 'species'
const LABEL = 'Species'

export const revalidate = 3600
export const dynamicParams = true

export function generateStaticParams() {
  return generateTaxonomyStaticParams(TYPES)
}

export function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  return generateTaxonomyMetadata(TYPES, SEGMENT, props.params)
}

/** Finite-number coord guard (a null/NaN coord must not place a marker at 0,0). */
function coord(v: number | null): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export default async function SpeciesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const species = (await sanityFetch({
    query: taxonomyDocBySlugQuery,
    params: { types: TYPES, slug },
    tags: ['targetSpecies', `targetSpecies:${slug}`],
  })) as TaxonomyDocBySlugQueryResult
  if (!species) notFound()

  const ids = bothIdForms(species._id)
  const [spots, posts] = await Promise.all([
    sanityFetch({
      query: spotsBySpeciesQuery,
      params: { ids },
      tags: ['spot', `targetSpecies:${slug}`],
    }) as Promise<SpotsBySpeciesQueryResult>,
    sanityFetch({
      query: postsBySpeciesQuery,
      params: { ids },
      tags: ['speciesPost', `targetSpecies:${slug}`],
    }) as Promise<PostsBySpeciesQueryResult>,
  ])

  const title = species.name ?? species.id ?? species._id

  // Map markers: every tagged spot / ramp with coordinates.
  const markers: OverviewMarker[] = spots.flatMap((s) => {
    const lat = coord(s.latitude)
    const lng = coord(s.longitude)
    if (lat === null || lng === null) return []
    return [{ id: s._id, name: s.name ?? s.id ?? s._id, slug: s.slug, lat, lng, kind: s.kind }]
  })

  // Cards: tagged spots that have a page.
  const spotCards: SpotChartCardData[] = spots
    .filter((s) => Boolean(s.slug))
    .map((s) => ({
      _id: s._id,
      name: s.name,
      id: s.id,
      slug: s.slug,
      lat: coord(s.latitude),
      lng: coord(s.longitude),
      regionName: regionForSpot(s.id).name,
    }))

  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8">
      <nav
        aria-label="Breadcrumb"
        className="font-mono text-xs uppercase tracking-wider text-header"
      >
        <Link href="/" className="hover:text-green-dark">
          Home
        </Link>{' '}
        {'›'}{' '}
        <Link href="/species" className="hover:text-green-dark">
          {LABEL}
        </Link>{' '}
        {'›'} {title}
      </nav>

      <header className="space-y-1">
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          {title}
        </h1>
        <p className="font-mono text-sm text-header">
          {spotCards.length} {spotCards.length === 1 ? 'spot' : 'spots'} ·{' '}
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
        </p>
      </header>

      {/* Where this species is tagged geographically. Client-only (Leaflet) via
          the loader; the page stays static. */}
      {markers.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
            Where it&apos;s tagged
          </h2>
          <SpotsOverviewMapLoader markers={markers} />
        </section>
      )}

      {spotCards.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-sans text-2xl font-semibold text-header">
            Spots ({spotCards.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spotCards.map((item) => (
              <SpotChartCard key={item._id} item={item} />
            ))}
          </div>
        </section>
      )}

      {/* Related species posts. */}
      <section className="space-y-4">
        <h2 className="font-sans text-2xl font-semibold text-header">
          Posts ({posts.length})
        </h2>
        {posts.length === 0 ? (
          <p className="text-sm text-header">— none —</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {posts.map((p) =>
              p.slug ? (
                <article key={p._id} className="box flex flex-col gap-2">
                  <h3 className="font-mono text-lg font-semibold leading-snug text-header">
                    <Link
                      href={`/species/posts/${p.slug}`}
                      className="hover:text-green-dark"
                    >
                      {p.name ?? 'Untitled'}
                    </Link>
                  </h3>
                  {p.excerpt && (
                    <p className="line-clamp-3 text-sm leading-relaxed text-ink">
                      {p.excerpt}
                    </p>
                  )}
                </article>
              ) : null,
            )}
          </div>
        )}
      </section>

      <JsonLd
        data={breadcrumbList([
          { name: 'Home', path: '/' },
          { name: LABEL, path: `/${SEGMENT}` },
          { name: title },
        ])}
      />
    </main>
  )
}
