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
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <nav
          aria-label="Breadcrumb"
          className="font-mono text-xs uppercase tracking-wider text-header"
        >
          <Link href="/" className="hover:text-green-dark">
            Home
          </Link>{' '}
          {'›'} {label}
        </nav>
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          {label}
        </h1>
        <p className="font-mono text-sm text-header">{docs.length} with a slug</p>
      </header>
      {docs.length === 0 ? (
        <p className="text-sm text-header">— none —</p>
      ) : (
        <ul className="box divide-y divide-body">
          {docs.map((doc) => (
            <li key={doc._id} className="py-2">
              <Link
                href={`/${segment}/${doc.slug}`}
                className="font-sans text-red-dark underline underline-offset-2 hover:decoration-green-light hover:decoration-2"
              >
                {doc.name ?? doc.id ?? doc._id}
              </Link>
              {doc.id && (
                <>
                  {' — '}
                  <code className="font-mono text-xs text-header">{doc.id}</code>
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
