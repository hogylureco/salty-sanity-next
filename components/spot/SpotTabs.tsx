'use client'

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react'

/**
 * Real tab system (WAI-ARIA tabs pattern), replacing the old anchor-scroll bar.
 *
 * CRITICAL: every panel is ALWAYS in the DOM — inactive ones are hidden with the
 * `hidden` attribute (display:none), never conditionally rendered. The server
 * renders all panel content; this client component only toggles visibility and
 * owns no data fetching.
 *
 * NOTE for callers: do NOT put a Tailwind display utility (grid/flex/block) on
 * the outermost node you pass as `content` if it would sit on the panel wrapper —
 * the wrapper here carries no display class so the UA `[hidden]{display:none}`
 * wins. Panel layout lives on a child inside the content.
 *
 * Active tab syncs to the URL hash (#videos, #weather) via replaceState (no extra
 * history entries); the hash is honored on load and on hashchange.
 */
export interface TabPanel {
  id: string
  label: string
  content: ReactNode
}

export function SpotTabs({ panels }: { panels: TabPanel[] }) {
  const [active, setActive] = useState(panels[0]?.id ?? '')
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const base = useId()
  const ids = panels.map((p) => p.id)
  const idsKey = ids.join(',')

  // Honor the hash on mount and on manual hash changes (deep links / back-fwd).
  useEffect(() => {
    function fromHash() {
      const h = window.location.hash.replace(/^#/, '')
      if (h && ids.includes(h)) setActive(h)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  function activate(id: string, focusTab = false) {
    setActive(id)
    // replaceState so tab clicks don't pile up history entries.
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${id}`)
    }
    if (focusTab) {
      const i = ids.indexOf(id)
      tabRefs.current[i]?.focus()
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next = -1
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        next = (index + 1) % panels.length
        break
      case 'ArrowLeft':
      case 'ArrowUp':
        next = (index - 1 + panels.length) % panels.length
        break
      case 'Home':
        next = 0
        break
      case 'End':
        next = panels.length - 1
        break
      default:
        return
    }
    e.preventDefault()
    activate(panels[next].id, true)
  }

  const tabDomId = (id: string) => `${base}-tab-${id}`
  const panelDomId = (id: string) => `${base}-panel-${id}`

  return (
    <div>
      <div
        role="tablist"
        aria-label="Spot sections"
        className="sticky top-16 z-20 -mx-4 flex gap-2 overflow-x-auto border-y border-body bg-body/90 px-4 py-2 backdrop-blur"
      >
        {panels.map((p, i) => {
          const isActive = active === p.id
          return (
            <button
              key={p.id}
              ref={(el) => {
                tabRefs.current[i] = el
              }}
              type="button"
              role="tab"
              id={tabDomId(p.id)}
              aria-selected={isActive}
              aria-controls={panelDomId(p.id)}
              tabIndex={isActive ? 0 : -1}
              onClick={() => activate(p.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`whitespace-nowrap rounded-full px-3 py-1 font-mono text-xs font-semibold transition-colors ${
                isActive
                  ? 'bg-box text-red-dark ring-2 ring-red-dark'
                  : 'text-header ring-1 ring-body hover:text-ink hover:ring-header/30'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      {panels.map((p) => {
        const isActive = active === p.id
        return (
          <div
            key={p.id}
            role="tabpanel"
            id={panelDomId(p.id)}
            aria-labelledby={tabDomId(p.id)}
            hidden={!isActive}
            tabIndex={0}
            className="mt-6 focus:outline-none"
          >
            {p.content}
          </div>
        )
      })}
    </div>
  )
}
