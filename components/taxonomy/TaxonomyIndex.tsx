import type { Metadata } from 'next'
import Link from 'next/link'

import { JsonLd } from '@/components/JsonLd'
import { breadcrumbList } from '@/lib/jsonld'
import { sanityFetch } from '@/lib/sanity/client'
import { taxonomyIndexQuery } from '@/lib/sanity/queries'

interface TaxonomyListItem {
  _id: string
  name: string | null
  id: string | null
  slug: string | null
}

export function generateTaxonomyIndexMetadata(label: string): Metadata {
  return { title: label, description: `All ${label.toLowerCase()} on Salty Cape.` }
}

export async function TaxonomyIndex({
  types,
  segment,
  label,
}: {
  types: string[]
  segment: string
  label: string
}) {
  const docs = (await sanityFetch({
    query: taxonomyIndexQuery,
    params: { types },
    // Index/card queries use the broad 'spot' tag — the revalidate handler emits
    // it for every spot AND taxonomy publish, so new/removed docs show up here.
    tags: ['spot'],
  })) as TaxonomyListItem[]

  return (
    <main>
      <nav aria-label="Breadcrumb">
        <Link href="/">Home</Link> {'›'} {label}
      </nav>
      <h1>{label}</h1>
      <p>{docs.length} with a slug</p>
      {docs.length === 0 ? (
        <p>— none —</p>
      ) : (
        <ul>
          {docs.map((doc) => (
            <li key={doc._id}>
              <Link href={`/${segment}/${doc.slug}`}>
                {doc.name ?? doc.id ?? doc._id}
              </Link>
              {doc.id && (
                <>
                  {' — '}
                  <code>{doc.id}</code>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <JsonLd
        data={breadcrumbList([{ name: 'Home', path: '/' }, { name: label }])}
      />
    </main>
  )
}
