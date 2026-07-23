'use client'

import { useMemo, useState } from 'react'

import { VideoCard } from '@/components/video/VideoCard'

/** A video with its per-facet values + the props VideoCard needs. */
export interface FilterVideo {
  _id: string
  title: string
  date: string | null
  regionName: string | null
  regionSlug: string | null
  thumbnailUrl: string | null
  href: string
  /** facetKey → the video's values for that facet. */
  facets: Record<string, string[]>
}

/** One filter facet: its options, already sorted; count = options.length. */
export interface VideoFacetGroup {
  key: string
  label: string
  options: string[]
}

function Checkboxes({
  options,
  selected,
  onToggle,
}: {
  options: string[]
  selected: string[]
  onToggle: (value: string) => void
}) {
  return (
    // Scrollbox: ~10 rows tall, scroll for the rest.
    <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex cursor-pointer items-center gap-2 text-sm text-ink"
        >
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            className="h-3.5 w-3.5 flex-shrink-0 accent-green-dark"
          />
          <span className="truncate" title={opt}>
            {opt}
          </span>
        </label>
      ))}
    </div>
  )
}

function FacetGroup({
  group,
  selected,
  onToggle,
  scrollbox,
}: {
  group: VideoFacetGroup
  selected: string[]
  onToggle: (value: string) => void
  /** The first (most-values) facet renders as an always-open scrollbox. */
  scrollbox: boolean
}) {
  const heading = (
    <span className="font-mono text-xs font-semibold uppercase tracking-wide text-header">
      {group.label}
      {selected.length > 0 && (
        <span className="ml-1.5 rounded-full bg-green-light/50 px-1.5 text-[0.65rem] text-ink">
          {selected.length}
        </span>
      )}
    </span>
  )

  if (scrollbox) {
    return (
      <div>
        <div className="mb-2">{heading}</div>
        <Checkboxes
          options={group.options}
          selected={selected}
          onToggle={onToggle}
        />
      </div>
    )
  }

  // Subsequent facets: a clickable dropdown revealing the next set of checkboxes.
  return (
    <details className="group border-t border-body pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
        {heading}
        <span className="text-header/60 transition-transform group-open:rotate-90">
          ▸
        </span>
      </summary>
      <div className="mt-2">
        <Checkboxes
          options={group.options}
          selected={selected}
          onToggle={onToggle}
        />
      </div>
    </details>
  )
}

export function FilterableVideoGrid({
  videos,
  facetGroups,
}: {
  videos: FilterVideo[]
  facetGroups: VideoFacetGroup[]
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>({})

  const toggle = (key: string, value: string) =>
    setSelected((prev) => {
      const cur = prev[key] ?? []
      return {
        ...prev,
        [key]: cur.includes(value)
          ? cur.filter((v) => v !== value)
          : [...cur, value],
      }
    })

  const activeCount = Object.values(selected).reduce(
    (n, arr) => n + arr.length,
    0,
  )

  const filtered = useMemo(
    () =>
      videos.filter((v) =>
        facetGroups.every((g) => {
          const sel = selected[g.key]
          if (!sel || sel.length === 0) return true
          const vals = v.facets[g.key] ?? []
          return sel.some((s) => vals.includes(s)) // OR within facet
        }),
      ),
    [videos, facetGroups, selected],
  )

  return (
    <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-8">
      {/* Filter sidebar (left of the grid). */}
      <aside className="mb-6 lg:mb-0">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
            Filter
          </h2>
          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => setSelected({})}
              className="font-mono text-xs font-semibold text-green-dark hover:underline"
            >
              Clear ({activeCount})
            </button>
          )}
        </div>
        <hr className="my-3 border-body" />
        <div className="space-y-3">
          {facetGroups.map((g, i) => (
            <FacetGroup
              key={g.key}
              group={g}
              selected={selected[g.key] ?? []}
              onToggle={(v) => toggle(g.key, v)}
              scrollbox={i === 0}
            />
          ))}
        </div>
      </aside>

      {/* Video grid (right). */}
      <div className="min-w-0">
        <p className="mb-4 font-mono text-sm text-header">
          {filtered.length} {filtered.length === 1 ? 'video' : 'videos'}
        </p>
        {filtered.length === 0 ? (
          <p className="text-sm text-[#535c71]">
            No videos match these filters.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((v) => (
              <VideoCard
                key={v._id}
                title={v.title}
                date={v.date}
                regionName={v.regionName}
                regionSlug={v.regionSlug}
                thumbnailUrl={v.thumbnailUrl}
                href={v.href}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
