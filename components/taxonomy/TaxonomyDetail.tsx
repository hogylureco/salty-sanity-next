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
    tags: ['spot', `${segment}:${slug}`],
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
    tags: ['spot', `${segment}:${slug}`],
  })) as TaxonomyDoc | null
  if (!doc) notFound()

  // Reverse lookup matches both id forms (plain + drafts.-prefixed).
  const spots = (await sanityFetch({
    query: taxonomyReverseSpotsQuery,
    params: { ids: bothIdForms(doc._id) },
    tags: ['spot', `${segment}:${slug}`],
  })) as SpotCardData[]

  const title = doc.name ?? doc.id ?? doc._id
  return (
    <main>
      <nav aria-label="Breadcrumb">
        <Link href="/">Home</Link> {'›'} <Link href={`/${segment}`}>{label}</Link>{' '}
        {'›'} {title}
      </nav>
      <h1>{title}</h1>
      {doc.id && (
        <p>
          <code>{doc.id}</code>
        </p>
      )}
      {doc.description && <SpotPortableText value={doc.description} />}
      <section>
        <h2>Spots ({spots.length})</h2>
        {spots.length === 0 ? (
          <p>— none —</p>
        ) : (
          spots.map((spot) => <SpotCard key={spot._id} spot={spot} />)
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
