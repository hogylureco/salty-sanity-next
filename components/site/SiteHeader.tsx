import Link from 'next/link'

/**
 * Primary site header. Sticky below the announcement bar. Server component —
 * the search input is a non-functional stub (search is its own phase), so no
 * client JS is needed here.
 */
const NAV_LINKS: Array<{ label: string; href: string }> = [
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

        {/* Search stub — search is its own phase; this input does nothing. */}
        {/* TODO: search is its own phase — non-functional stub */}
        <div className="order-3 w-full sm:order-none sm:w-auto sm:flex-1">
          <input
            type="search"
            readOnly
            aria-label="Search (coming soon)"
            placeholder="Search spots, species, gear…"
            className="w-full max-w-md cursor-not-allowed rounded-[5px] border border-body bg-body px-3 py-1.5 font-mono text-sm text-header placeholder:text-header/60 focus:outline-none"
          />
        </div>

        {/* Subscribe CTA */}
        <Link
          href="/#newsletter"
          className="rounded-[5px] bg-red-dark px-4 py-1.5 font-mono text-sm font-semibold text-white transition-colors hover:bg-red-light"
        >
          Subscribe
        </Link>
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
