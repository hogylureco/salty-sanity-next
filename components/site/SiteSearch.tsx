'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

import MiniSearch, { type SearchResult } from 'minisearch'

import {
  TYPE_LABELS,
  type LogicalType,
  type SearchDoc,
} from '@/lib/search/shared'

/**
 * Instant site search (Step 2). Client-only. On first open it fetches the static
 * `/search-index.json` artifact ONCE (built by `lib/search/build-index.ts`),
 * builds an in-memory MiniSearch index, and searches it locally — there is no
 * per-keystroke network or Sanity call. Deep-links to each record's `url`.
 *
 * The index is loaded lazily (on first focus / ⌘K), so it costs nothing on pages
 * where the user never searches. A single MiniSearch instance is memoized in a
 * ref for the lifetime of the mounted header.
 *
 * Accessibility: a combobox controlling a listbox, with roving
 * `aria-activedescendant` selection driven by the arrow keys.
 */

/** A stored result row (MiniSearch merges stored fields onto the hit). */
type Hit = SearchResult & SearchDoc

/** Max rows rendered in the dropdown regardless of match count. */
const MAX_RESULTS = 24

/** Fields searched, with title/subtitle weighted above flattened body. */
const SEARCH_FIELDS = ['title', 'subtitle', 'region', 'text'] as const
/** Fields carried through onto each hit for rendering (no re-fetch). */
const STORE_FIELDS = [
  'type',
  'title',
  'subtitle',
  'url',
  'region',
  'snippet',
] as const

function buildIndex(docs: SearchDoc[]): MiniSearch<SearchDoc> {
  const mini = new MiniSearch<SearchDoc>({
    idField: 'key',
    fields: [...SEARCH_FIELDS],
    storeFields: [...STORE_FIELDS],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { title: 3, subtitle: 2, region: 1.5 },
      combineWith: 'AND',
    },
  })
  mini.addAll(docs)
  return mini
}

export function SiteSearch() {
  const router = useRouter()
  const listboxId = useId()

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [facet, setFacet] = useState<LogicalType | null>(null)
  const [active, setActive] = useState(0)

  // Lazy index load. `mini` is state (not a ref) because it is read during
  // render to compute results; `status` gates the one-time fetch.
  const [mini, setMini] = useState<MiniSearch<SearchDoc> | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle',
  )

  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  /** Fetch + build the index once. Safe to call repeatedly. */
  const ensureIndex = useCallback(async () => {
    if (status !== 'idle') return
    setStatus('loading')
    try {
      const res = await fetch('/search-index.json')
      if (!res.ok) throw new Error(`search-index ${res.status}`)
      const docs = (await res.json()) as SearchDoc[]
      setMini(buildIndex(docs))
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [status])

  // ⌘K / Ctrl-K focuses the input from anywhere; Escape closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        void ensureIndex()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ensureIndex])

  // Close on outside click.
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Raw ranked hits for the current query (unfiltered by facet).
  const allHits = useMemo<Hit[]>(() => {
    const q = query.trim()
    if (!q || !mini) return []
    return mini.search(q) as Hit[]
  }, [query, mini])

  // Per-type counts drive the facet chips.
  const counts = useMemo(() => {
    const c = new Map<LogicalType, number>()
    for (const h of allHits) c.set(h.type, (c.get(h.type) ?? 0) + 1)
    return c
  }, [allHits])

  const hits = useMemo(() => {
    const filtered = facet ? allHits.filter((h) => h.type === facet) : allHits
    return filtered.slice(0, MAX_RESULTS)
  }, [allHits, facet])

  const showPanel = open && query.trim().length > 0

  function go(hit: Hit) {
    setOpen(false)
    setQuery('')
    router.push(hit.url)
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (!showPanel || hits.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % hits.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + hits.length) % hits.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const hit = hits[active]
      if (hit) go(hit)
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative order-3 w-full sm:order-none sm:w-auto sm:flex-1"
    >
      <input
        ref={inputRef}
        type="search"
        value={query}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={
          showPanel && hits[active] ? `${listboxId}-${active}` : undefined
        }
        aria-label="Search spots, species, gear"
        placeholder="Search spots, species, gear…"
        autoComplete="off"
        className="w-full max-w-md rounded-[5px] border border-body bg-body px-3 py-1.5 font-mono text-sm text-header placeholder:text-header/60 focus:border-green-dark focus:outline-none"
        onFocus={() => {
          setOpen(true)
          void ensureIndex()
        }}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onKeyDown={onInputKeyDown}
      />

      {showPanel && (
        <div className="absolute left-0 top-full z-50 mt-2 w-full min-w-[20rem] max-w-md overflow-hidden rounded-[5px] border border-body bg-box shadow-lg">
          {/* Facet chips — only meaningful once results exist. */}
          {allHits.length > 0 && counts.size > 1 && (
            <div className="flex flex-wrap gap-1 border-b border-body px-2 py-2">
              <FacetChip
                label={`All (${allHits.length})`}
                active={facet === null}
                onClick={() => {
                  setFacet(null)
                  setActive(0)
                }}
              />
              {[...counts.entries()].map(([type, n]) => (
                <FacetChip
                  key={type}
                  label={`${TYPE_LABELS[type]} (${n})`}
                  active={facet === type}
                  onClick={() => {
                    setFacet(type)
                    setActive(0)
                  }}
                />
              ))}
            </div>
          )}

          <ul
            id={listboxId}
            role="listbox"
            aria-label="Search results"
            className="max-h-[60vh] overflow-y-auto py-1"
          >
            {status === 'loading' && mini === null && (
              <li className="px-3 py-2 font-mono text-xs text-header/60">
                Loading index…
              </li>
            )}
            {status === 'error' && (
              <li className="px-3 py-2 font-mono text-xs text-red-dark">
                Search is unavailable right now.
              </li>
            )}
            {status === 'ready' && hits.length === 0 && (
              <li className="px-3 py-2 font-mono text-xs text-header/60">
                No matches for “{query.trim()}”.
              </li>
            )}
            {hits.map((hit, i) => (
              <li
                key={hit.id}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={i === active}
              >
                <Link
                  href={hit.url}
                  onClick={() => go(hit)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex flex-col gap-0.5 px-3 py-2 no-underline ${
                    i === active ? 'bg-body' : ''
                  }`}
                >
                  <span className="flex items-baseline gap-2">
                    <span className="truncate font-mono text-sm font-semibold text-header">
                      {hit.title}
                    </span>
                    <span className="ml-auto shrink-0 rounded-[3px] bg-green-dark/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green-dark">
                      {TYPE_LABELS[hit.type]}
                    </span>
                  </span>
                  {(hit.subtitle || hit.snippet) && (
                    <span className="truncate font-mono text-xs text-header/60">
                      {hit.subtitle ? `${hit.subtitle} · ` : ''}
                      {hit.snippet}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function FacetChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[3px] px-2 py-0.5 font-mono text-[11px] tracking-wide transition-colors ${
        active
          ? 'bg-green-dark text-white'
          : 'bg-body text-header/70 hover:text-header'
      }`}
    >
      {label}
    </button>
  )
}
