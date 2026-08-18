import Link from 'next/link'

import { sanityFetch } from '@/lib/sanity/client'
import { taxonomyIndexQuery } from '@/lib/sanity/queries'
import type { TaxonomyIndexQueryResult } from '@/sanity.types'

/**
 * Site footer: a newsletter CTA band followed by the navy link footer. The
 * Regions/Species columns are built from real taxonomy queries (navigation over
 * data we have); the How-To column is static links to index routes that exist.
 *
 * Weak-ref reality: taxonomy docs resolve fine here (direct type queries, not
 * dereferenced spot refs), but items are still null-guarded and empty lists are
 * skipped so a sparse dataset degrades gracefully.
 */
const HOW_TO_LINKS: Array<{ label: string; href: string }> = [
  { label: 'Approaches', href: '/approaches' },
  { label: 'Techniques', href: '/techniques' },
  { label: 'Structures', href: '/structures' },
  { label: 'Baitfish', href: '/baitfish' },
  { label: 'Seasons', href: '/seasons' },
  { label: 'Micro-Seasons', href: '/micro-seasons' },
]

async function taxonomyColumn(types: string[]): Promise<
  Array<{ _id: string; name: string; slug: string }>
> {
  const rows = (await sanityFetch({
    query: taxonomyIndexQuery,
    params: { types },
    tags: types,
  })) as TaxonomyIndexQueryResult
  return rows
    .filter((r): r is typeof r & { name: string; slug: string } =>
      Boolean(r.name && r.slug),
    )
    .slice(0, 8)
    .map((r) => ({ _id: r._id, name: r.name, slug: r.slug }))
}

export async function SiteFooter() {
  const [regions, species] = await Promise.all([
    taxonomyColumn(['region']),
    taxonomyColumn(['targetSpecies']),
  ])
  const year = new Date().getFullYear()

  const heading =
    'mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-white/60'
  const linkClass = 'text-sm text-white/80 hover:text-white'

  return (
    <footer className="mt-16">
      {/* Newsletter / Subscribe CTA band removed per request (the "Subscribe"
          subscription reference). Restore this block to bring the newsletter
          signup band back.
      <section
        id="newsletter"
        className="border-y border-body bg-body px-4 py-12"
      >
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
          <h2 className="font-mono text-2xl font-bold text-header">
            Tight lines, straight to your inbox
          </h2>
          <p className="max-w-xl text-sm text-header">
            Seasonal bite windows, new spot breakdowns, and Capt. Mike’s field
            notes. No spam — just fishing.
          </p>
          <form
            className="flex w-full max-w-md flex-col gap-2 sm:flex-row"
            aria-label="Newsletter signup (coming soon)"
          >
            <input
              type="email"
              readOnly
              aria-label="Email address (coming soon)"
              placeholder="you@example.com"
              className="w-full cursor-not-allowed rounded-[5px] border border-body bg-box px-3 py-2 font-mono text-sm text-header placeholder:text-header/60 focus:outline-none"
            />
            <button
              type="button"
              className="shrink-0 rounded-[5px] bg-red-dark px-5 py-2 font-mono text-sm font-semibold text-white transition-colors hover:bg-red-light"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
      */}

      {/* Navy link footer. */}
      <div className="bg-[#0e2a3b] px-4 py-12 text-white">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link
              href="/"
              className="font-mono text-lg font-bold tracking-tight text-white"
            >
              SALTY<span className="text-green-light"> CAPE</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-white/60">
              Cape Cod fishing spots, conditions, and technique.
            </p>
          </div>

          {regions.length > 0 && (
            <div>
              <h3 className={heading}>Regions</h3>
              <ul className="space-y-2">
                {regions.map((r) => (
                  <li key={r._id}>
                    <Link href={`/regions/${r.slug}`} className={linkClass}>
                      {r.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/regions"
                    className="text-sm font-semibold text-green-light hover:text-white"
                  >
                    All regions →
                  </Link>
                </li>
              </ul>
            </div>
          )}

          {species.length > 0 && (
            <div>
              <h3 className={heading}>Species</h3>
              <ul className="space-y-2">
                {species.map((s) => (
                  <li key={s._id}>
                    <Link href={`/species/${s.slug}`} className={linkClass}>
                      {s.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/species"
                    className="text-sm font-semibold text-green-light hover:text-white"
                  >
                    All species →
                  </Link>
                </li>
              </ul>
            </div>
          )}

          <div>
            <h3 className={heading}>How-To</h3>
            <ul className="space-y-2">
              {HOW_TO_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 max-w-6xl border-t border-white/10 pt-6 text-xs text-white/50">
          © {year} Salty Cape. Conditions data from NOAA. Not for navigation.
        </div>
      </div>
    </footer>
  )
}
