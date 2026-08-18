import Link from 'next/link'

import { SiteSearch } from '@/components/site/SiteSearch'

/**
 * Primary site header. Sticky below the announcement bar. Server component; the
 * only interactive island is <SiteSearch />, a client component that lazily
 * loads the static search index on first focus.
 */
const NAV_LINKS: Array<{ label: string; href: string }> = [
  { label: "Capt. Mike's System", href: '/system' },
  { label: 'Spots', href: '/spots' },
  { label: 'Videos', href: '/videos' },
  { label: 'Species', href: '/species' },
  { label: 'Regions', href: '/regions' },
  { label: 'Gear', href: '/gear' },
  { label: 'Structures', href: '/structures' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-body bg-box/95 backdrop-blur supports-[backdrop-filter]:bg-box/80">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
        {/* Wordmark */}
        <Link
          href="/"
          className="font-mono text-lg font-bold tracking-tight text-header"
        >
          SALTY<span className="text-green-dark"> CAPE</span>
        </Link>

        {/* Instant search — client island, lazy-loads /search-index.json. */}
        <SiteSearch />

        {/* CTAs removed per request — the "Get Spot Loc" (Spot Loc) and "Subscribe"
            (Subscription) promos previously sat here. Restore this block to bring
            them back; /spotloc pages still exist, just no longer linked.
        <div className="flex items-center gap-2">
          <Link
            href="/spotloc"
            className="rounded-[5px] bg-green-dark px-4 py-1.5 font-mono text-sm font-semibold text-white transition-colors hover:bg-[#096b52]"
          >
            Get Spot Loc
          </Link>
          <Link
            href="/#newsletter"
            className="rounded-[5px] bg-red-dark px-4 py-1.5 font-mono text-sm font-semibold text-white transition-colors hover:bg-red-light"
          >
            Subscribe
          </Link>
        </div>
        */}
      </div>

      {/* Primary nav */}
      <nav className="border-t border-body">
        <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-1 px-4 py-2">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="font-mono text-xs font-semibold uppercase tracking-wider text-header hover:text-green-dark"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
