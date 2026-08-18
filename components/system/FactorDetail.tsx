import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import {
  SpotPortableText,
  type PortableTextValue,
} from '@/components/portable-text/SpotPortableText'
import { breadcrumbList } from '@/lib/jsonld'
import { sanityFetch } from '@/lib/sanity/client'
import { factorBySlugQuery, factorSlugsQuery } from '@/lib/sanity/queries'
import { systemZoneByRef, type SystemZone } from '@/lib/system-zones'

/**
 * A single Environmental / Observational factor. Both types are structurally
 * identical (identity trio + richText `description`), so one template serves
 * both — the route supplies the doc `type` and its URL `segment`.
 *
 * Unlike the generic <TaxonomyDetail>, this template has NO reverse-spots
 * section: spots carry `environmentalFactors` / `observationalFactors` as
 * portable-text FIELDS, not references, so nothing points back at these docs.
 * Instead it links out to the system pages the factor is tagged for.
 */
interface FactorDoc {
  _id: string
  _type: string
  name: string | null
  id: string | null
  slug: string | null
  description: PortableTextValue | null
  descriptionText: string | null
  zoneRefs: string[] | null
}

export async function generateFactorStaticParams(type: string) {
  const rows = (await sanityFetch({
    query: factorSlugsQuery,
    params: { type },
  })) as Array<{ slug: string | null }>
  return rows
    .filter((r): r is { slug: string } => Boolean(r.slug))
    .map((r) => ({ slug: r.slug }))
}

export async function generateFactorMetadata(
  type: string,
  segment: string,
  paramsPromise: Promise<{ slug: string }>,
): Promise<Metadata> {
  const { slug } = await paramsPromise
  const doc = (await sanityFetch({
    query: factorBySlugQuery,
    params: { type, slug },
  })) as FactorDoc | null
  if (!doc) return {}
  const description = doc.descriptionText
    ? doc.descriptionText.replace(/\s+/g, ' ').trim().slice(0, 155)
    : undefined
  const title = doc.name ?? doc.id ?? segment
  return {
    title,
    description,
    alternates: { canonical: `/${segment}/${slug}` },
  }
}

export async function FactorDetail({
  type,
  label,
  params,
}: {
  type: string
  label: string
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const doc = (await sanityFetch({
    query: factorBySlugQuery,
    params: { type, slug },
  })) as FactorDoc | null
  if (!doc) notFound()

  const title = doc.name ?? doc.id ?? doc._id

  // Resolve the weak zone refs to the system pages this factor appears in,
  // dropping any that point at a zone with no system page (Kayak, CC Canal, X)
  // and de-duping by slug.
  const zones = (doc.zoneRefs ?? [])
    .map((ref) => systemZoneByRef(ref))
    .filter((z): z is SystemZone => Boolean(z))
    .filter((z, i, arr) => arr.findIndex((o) => o.slug === z.slug) === i)

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
          <Link href="/system" className="hover:text-green-dark">
            Capt. Mike&rsquo;s System
          </Link>{' '}
          {'›'} {label}
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

      {zones.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-green-dark">
            Appears in
          </h2>
          <div className="flex flex-wrap gap-3">
            {zones.map((zone) => (
              <Link
                key={zone.slug}
                href={`/system/${zone.slug}`}
                className="rounded-[5px] border border-body bg-box px-4 py-2 font-mono text-sm font-semibold text-header transition-colors hover:border-green-light hover:text-green-dark"
              >
                {zone.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      <JsonLd
        data={breadcrumbList([
          { name: 'Home', path: '/' },
          { name: "Capt. Mike's System", path: '/system' },
          { name: label },
          { name: title },
        ])}
      />
    </main>
  )
}
