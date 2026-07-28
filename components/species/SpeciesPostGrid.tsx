'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

/** A resolved facet reference (species or baitfish). `slug` links where it exists. */
export interface PostFacet {
  name: string
  slug: string | null
}

/** One card in the species-post grid. All strings are already stega-cleaned. */
export interface SpeciesPostItem {
  _id: string
  name: string
  slug: string
  excerpt: string
  species: PostFacet[]
  baitfish: PostFacet[]
}

/** {name → {slug, count}} rolled up across every post, sorted by name. */
function facetCounts(
  posts: SpeciesPostItem[],
  pick: (p: SpeciesPostItem) => PostFacet[],
): Array<{ name: string; slug: string | null; count: number }> {
  const map = new Map<string, { slug: string | null; count: number }>()
  for (const p of posts) {
    for (const f of pick(p)) {
      const prev = map.get(f.name)
      if (prev) prev.count += 1
      else map.set(f.name, { slug: f.slug, count: 1 })
    }
  }
  return [...map.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

function FacetList({
  title,
  facets,
  selected,
  onToggle,
  linkBase,
}: {
  title: string
  facets: Array<{ name: string; slug: string | null; count: number }>
  selected: Set<string>
  onToggle: (name: string) => void
  /** When set, each facet name links to `${linkBase}/${slug}` (e.g. a species page). */
  linkBase?: string
}) {
  if (facets.length === 0) return null
  return (
    <div className="space-y-2">
      <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-header">
        {title}
      </h3>
      <ul className="space-y-1">
        {facets.map((f) => (
          <li key={f.name} className="flex items-center gap-1.5 text-sm">
            <label className="flex flex-1 cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={selected.has(f.name)}
                onChange={() => onToggle(f.name)}
                className="h-3.5 w-3.5 accent-green-dark"
              />
              <span className="flex-1 text-ink">{f.name}</span>
              <span className="font-mono text-xs text-header/60">{f.count}</span>
            </label>
            {linkBase && f.slug && (
              <Link
                href={`${linkBase}/${f.slug}`}
                aria-label={`${f.name} page`}
                title={`${f.name} page`}
                className="shrink-0 font-mono text-xs text-green-dark hover:underline"
              >
                ↗
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SpeciesPostGrid({ posts }: { posts: SpeciesPostItem[] }) {
  const [query, setQuery] = useState('')
  const [species, setSpecies] = useState<Set<string>>(new Set())
  const [baitfish, setBaitfish] = useState<Set<string>>(new Set())

  const speciesFacets = useMemo(() => facetCounts(posts, (p) => p.species), [posts])
  const baitfishFacets = useMemo(() => facetCounts(posts, (p) => p.baitfish), [posts])

  const toggle = (set: Set<string>, setter: (s: Set<string>) => void) => (name: string) => {
    const next = new Set(set)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    setter(next)
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q) && !p.excerpt.toLowerCase().includes(q)) {
        return false
      }
      if (species.size > 0 && !p.species.some((s) => species.has(s.name))) return false
      if (baitfish.size > 0 && !p.baitfish.some((b) => baitfish.has(b.name))) return false
      return true
    })
  }, [posts, query, species, baitfish])

  const active = query.trim() !== '' || species.size > 0 || baitfish.size > 0
  const clear = () => {
    setQuery('')
    setSpecies(new Set())
    setBaitfish(new Set())
  }

  return (
    <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* Left rail: search + facet filters. */}
      <aside className="mb-8 lg:mb-0">
        <div className="box space-y-5 lg:sticky lg:top-28">
          <div className="space-y-1.5">
            <label
              htmlFor="post-search"
              className="font-mono text-xs font-semibold uppercase tracking-wider text-header"
            >
              Search
            </label>
            <input
              id="post-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search posts…"
              className="w-full rounded-[5px] border border-body bg-body px-3 py-1.5 font-sans text-sm text-ink placeholder:text-header/60 focus:border-green-dark focus:outline-none"
            />
          </div>

          <FacetList
            title="Species"
            facets={speciesFacets}
            selected={species}
            onToggle={toggle(species, setSpecies)}
            linkBase="/species"
          />
          <FacetList
            title="Baitfish"
            facets={baitfishFacets}
            selected={baitfish}
            onToggle={toggle(baitfish, setBaitfish)}
            linkBase="/baitfish"
          />

          {active && (
            <button
              type="button"
              onClick={clear}
              className="w-full rounded-[5px] px-3 py-1.5 font-mono text-xs font-semibold text-header ring-1 ring-body hover:text-ink hover:ring-header/30"
            >
              Clear filters
            </button>
          )}
        </div>
      </aside>

      {/* Right: results. */}
      <section className="min-w-0 space-y-4">
        <p className="font-mono text-sm text-header">
          {filtered.length} {filtered.length === 1 ? 'post' : 'posts'}
        </p>

        {filtered.length === 0 ? (
          <p className="text-sm text-[#535c71]">No posts match these filters.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filtered.map((p) => (
              <article key={p._id} className="box flex flex-col gap-2">
                {/* Species tags sit ABOVE the title — the primary way to see
                    (and jump to) what a post covers. */}
                {p.species.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {p.species.map((s) =>
                      s.slug ? (
                        <Link
                          key={s.name}
                          href={`/species/${s.slug}`}
                          className="rounded-[3px] bg-green-dark/15 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-green-dark hover:bg-green-dark/25"
                        >
                          {s.name}
                        </Link>
                      ) : (
                        <span
                          key={s.name}
                          className="rounded-[3px] bg-body px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-header/70"
                        >
                          {s.name}
                        </span>
                      ),
                    )}
                  </div>
                )}
                <h2 className="font-mono text-lg font-semibold leading-snug text-header">
                  <Link
                    href={`/species/posts/${p.slug}`}
                    className="hover:text-green-dark"
                  >
                    {p.name}
                  </Link>
                </h2>
                {p.excerpt && (
                  <p className="line-clamp-3 text-sm leading-relaxed text-ink">
                    {p.excerpt}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
