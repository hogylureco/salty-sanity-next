'use client'

import { useMemo, useState } from 'react'

import { SpotChartCard } from '@/components/spot/SpotChartCard'

/** One grid entry: identity + coordinates + the facets it filters by. */
export interface FilterableSpotItem {
  _id: string
  name: string | null
  id: string | null
  slug: string | null
  lat: number | null
  lng: number | null
  regionName: string | null
  /** Resolved structure names tagged on the spot (may be empty). */
  structures: string[]
  /** Resolved target-species names tagged on the spot (may be empty). */
  species: string[]
}

const ALL = '__all__'

/** Unique, sorted facet values across all items. */
function optionsFor(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function Select({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  allLabel: string
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-mono font-semibold uppercase tracking-wide text-header">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[5px] border border-body bg-box px-2 py-1.5 font-sans text-sm text-ink focus:outline-none focus:ring-2 focus:ring-green-light"
      >
        <option value={ALL}>{allLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export function FilterableSpotGrid({ items }: { items: FilterableSpotItem[] }) {
  const [region, setRegion] = useState(ALL)
  const [structure, setStructure] = useState(ALL)
  const [species, setSpecies] = useState(ALL)

  const regionOptions = useMemo(
    () => optionsFor(items.map((i) => i.regionName ?? '')),
    [items],
  )
  const structureOptions = useMemo(
    () => optionsFor(items.flatMap((i) => i.structures)),
    [items],
  )
  const speciesOptions = useMemo(
    () => optionsFor(items.flatMap((i) => i.species)),
    [items],
  )

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (region === ALL || i.regionName === region) &&
          (structure === ALL || i.structures.includes(structure)) &&
          (species === ALL || i.species.includes(species)),
      ),
    [items, region, structure, species],
  )

  const active = region !== ALL || structure !== ALL || species !== ALL
  const clear = () => {
    setRegion(ALL)
    setStructure(ALL)
    setSpecies(ALL)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Region"
          value={region}
          onChange={setRegion}
          options={regionOptions}
          allLabel="All regions"
        />
        <Select
          label="Structure"
          value={structure}
          onChange={setStructure}
          options={structureOptions}
          allLabel="All structures"
        />
        <Select
          label="Species"
          value={species}
          onChange={setSpecies}
          options={speciesOptions}
          allLabel="All species"
        />
        {active && (
          <button
            type="button"
            onClick={clear}
            className="rounded-full px-3 py-1.5 font-mono text-xs font-semibold text-header ring-1 ring-body hover:text-ink hover:ring-header/30"
          >
            Clear filters
          </button>
        )}
        <p className="ml-auto self-center font-mono text-sm text-header">
          {filtered.length} {filtered.length === 1 ? 'spot' : 'spots'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[#535c71]">No spots match these filters.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((i) => (
            <SpotChartCard key={i._id} item={i} />
          ))}
        </div>
      )}
    </section>
  )
}
