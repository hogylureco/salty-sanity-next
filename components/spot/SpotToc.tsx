'use client'

import { useEffect, useState } from 'react'

import type { TocEntry } from '@/lib/spot-sections'

/**
 * Sticky left-rail table of contents (Step 1). Entries + sub-entries are handed
 * in from the page's single section registry, so the TOC can't drift from the
 * rendered sections. Active section is tracked with one IntersectionObserver and
 * gets the red accent from the screenshot. Hidden below `lg` (the tab bar is the
 * mobile nav).
 */
export function SpotToc({ entries }: { entries: TocEntry[] }) {
  const [active, setActive] = useState<string | null>(entries[0]?.id ?? null)

  useEffect(() => {
    const ids = entries.flatMap((e) => [e.id, ...e.subs.map((s) => s.id)])
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el != null)
    if (els.length === 0) return

    // Track each observed heading's viewport top; the active entry is whichever
    // intersecting element sits closest to the top of the scroll band.
    const tops = new Map<string, number>()
    const observer = new IntersectionObserver(
      (records) => {
        for (const r of records) {
          if (r.isIntersecting) tops.set(r.target.id, r.boundingClientRect.top)
          else tops.delete(r.target.id)
        }
        let best: string | null = null
        let bestTop = Infinity
        for (const [id, top] of tops) {
          if (top < bestTop) {
            bestTop = top
            best = id
          }
        }
        if (best) setActive(best)
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [entries])

  return (
    <nav
      aria-label="On this page"
      className="hidden lg:block lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
    >
      <p className="mb-3 font-mono text-[0.7rem] font-semibold uppercase tracking-wider text-header/70">
        On this page
      </p>
      <ul className="space-y-0.5 text-sm">
        {entries.map((entry) => {
          const entryActive =
            active === entry.id || entry.subs.some((s) => s.id === active)
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                className={`block border-l-2 py-1 pl-3 font-mono text-xs leading-snug transition-colors ${
                  entryActive
                    ? 'border-red-dark font-semibold text-red-dark'
                    : 'border-transparent text-header hover:text-ink'
                } ${entry.hasContent ? '' : 'opacity-60'}`}
              >
                {entry.title}
              </a>
              {entry.subs.length > 0 && (
                <ul className="space-y-0.5">
                  {entry.subs.map((sub) => (
                    <li key={sub.id}>
                      <a
                        href={`#${sub.id}`}
                        className={`block border-l-2 py-0.5 pl-6 text-[0.7rem] leading-snug transition-colors ${
                          active === sub.id
                            ? 'border-red-dark font-semibold text-red-dark'
                            : 'border-transparent text-header/80 hover:text-ink'
                        }`}
                      >
                        {sub.title}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
