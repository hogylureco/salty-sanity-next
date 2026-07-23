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

    // Active = the last heading whose top has scrolled above the "active line"
    // (just under the sticky site header). Computed from LIVE positions on each
    // scroll frame, so it advances monotonically through the headings in document
    // order and never oscillates between two of them — the stale-position compare
    // in the old IntersectionObserver was what flickered the rail (and its subs)
    // near section boundaries. `els` is already in document order (entry, then its
    // subs, then the next entry), matching the scroll order.
    const ACTIVE_LINE = 120 // ~ sticky header height (scroll-mt-28 = 112px) + gap

    let frame = 0
    const update = () => {
      frame = 0
      let current = els[0].id
      for (const el of els) {
        if (el.getBoundingClientRect().top <= ACTIVE_LINE) current = el.id
        else break
      }
      setActive((prev) => (prev === current ? prev : current))
    }
    // Coalesce scroll bursts into one measurement per frame (rAF) — cheap for the
    // dozen-odd headings, and avoids layout thrash.
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [entries])

  return (
    <nav
      aria-label="On this page"
      className="hidden lg:block lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
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
              {/* H3 sub-entries expand only while this H2 is the active section
                  (you've scrolled past it and not yet reached the next H2) — i.e.
                  `entryActive`, which is true when the H2 or one of its H3s is
                  active. Collapsed otherwise so the rail stays scannable. */}
              {entryActive && entry.subs.length > 0 && (
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
