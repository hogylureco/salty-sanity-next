import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import { SpotCard, type SpotCardData } from '@/components/SpotCard'
import {
  SpotPortableText,
  type PortableTextValue,
} from '@/components/portable-text/SpotPortableText'
import { breadcrumbList } from '@/lib/jsonld'
import { sanityFetch } from '@/lib/sanity/client'
import {
  taxonomyDocBySlugQuery,
  taxonomyReverseSpotsQuery,
  taxonomySlugsQuery,
} from '@/lib/sanity/queries'
import { bothIdForms } from '@/lib/taxonomy'

// Generic across taxonomy types (query filters on a `$types` param), so the
// result can't be narrowed by typegen — describe the projected shape locally.
interface TaxonomyDoc {
  _id: string
  _type: string
  name: string | null
  id: string | null
  slug: string | null
  description: PortableTextValue | null
  descriptionText: string | null
}

export async function generateTaxonomyStaticParams(types: string[]) {
  const slugs = (await sanityFetch({
    query: taxonomySlugsQuery,
    params: { types },
    tags: ['spot'],
  })) as Array<{ slug: string | null }>
  return slugs
    .filter((s): s is { slug: string } => Boolean(s.slug))
    .map((s) => ({ slug: s.slug }))
}

export async function generateTaxonomyMetadata(
  types: string[],
  segment: string,
  paramsPromise: Promise<{ slug: string }>,
): Promise<Metadata> {
  const { slug } = await paramsPromise
  const doc = (await sanityFetch({
    query: taxonomyDocBySlugQuery,
    params: { types, slug },
    tags: ['spot', ...types.map((type) => `${type}:${slug}`)],
  })) as TaxonomyDoc | null
  if (!doc) return {}
  const description = doc.descriptionText
    ? doc.descriptionText.replace(/\s+/g, ' ').trim().slice(0, 155)
    : undefined
  return { title: doc.name ?? doc.id ?? segment, description }
}

export async function TaxonomyDetail({
  types,
  segment,
  label,
  params,
}: {
  types: string[]
  segment: string
  label: string
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const doc = (await sanityFetch({
    query: taxonomyDocBySlugQuery,
    params: { types, slug },
    tags: ['spot', ...types.map((type) => `${type}:${slug}`)],
  })) as TaxonomyDoc | null
  if (!doc) notFound()

  // Reverse lookup matches both id forms (plain + drafts.-prefixed).
  const spots = (await sanityFetch({
    query: taxonomyReverseSpotsQuery,
    params: { ids: bothIdForms(doc._id) },
    tags: ['spot', ...types.map((type) => `${type}:${slug}`)],
  })) as SpotCardData[]

  const title = doc.name ?? doc.id ?? doc._id
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <nav
          aria-label="Breadcrumb"
          className="font-mono text-xs uppercase tracking-wider text-header"
        >
          <Link href="/" className="hover:text-green-dark">
            Home
          </Link>{' '}
          {'›'}{' '}
          <Link href={`/${segment}`} className="hover:text-green-dark">
            {label}
          </Link>{' '}
          {'›'} {title}
        </nav>
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          {title}
        </h1>
        {doc.id && <p className="font-mono text-sm text-header">{doc.id}</p>}
      </header>
      {doc.description && (
        <div className="box">
          <SpotPortableText value={doc.description} />
        </div>
      )}
      <section className="space-y-4">
        <h2 className="font-sans text-2xl font-semibold text-header">
          Spots ({spots.length})
        </h2>
        {spots.length === 0 ? (
          <p className="text-sm text-header">— none —</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spots.map((spot) => (
              <SpotCard key={spot._id} spot={spot} />
            ))}
          </div>
        )}
      </section>
      <JsonLd
        data={breadcrumbList([
          { name: 'Home', path: '/' },
          { name: label, path: `/${segment}` },
          { name: title },
        ])}
      />
    </main>
  )
}
