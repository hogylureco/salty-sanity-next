import Link from 'next/link'

import type { RailRef } from './StructureSpecies'

export interface ChipGroup {
  label: string
  /** Taxonomy route base, or null when no route exists (chips render inert). */
  base: string | null
  items: Array<RailRef | null> | null
}

const chipBase = 'inline-block rounded-[5px] bg-body px-2 py-1 font-mono text-xs'

/**
 * Compact "More about this spot" block for the reference fields that no other
 * section surfaces (lureGearCategory, parentLure, techniqueRetrieve, mode, zone,
 * boatRamps). Preserves the pre-redesign audit surface — nothing silently drops.
 */
export function MoreAboutSpot({ groups }: { groups: ChipGroup[] }) {
  // Only render groups that actually resolved to at least one item.
  const populated = groups
    .map((g) => ({
      ...g,
      resolved: (g.items ?? []).filter((r): r is RailRef => r != null),
    }))
    .filter((g) => g.resolved.length > 0)

  if (populated.length === 0) return null

  return (
    <section className="box" aria-labelledby="more-about">
      <h2
        id="more-about"
        className="mb-1 font-mono text-sm font-semibold uppercase tracking-wider text-header"
      >
        More About This Spot
      </h2>
      <hr className="mb-4 border-body" />
      <div className="space-y-4">
        {populated.map((g) => (
          <div key={g.label}>
            <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-header">
              {g.label}
            </p>
            <ul className="flex flex-wrap gap-2">
              {g.resolved.map((r) => (
                <li key={r._id}>
                  {g.base && r.slug ? (
                    <Link
                      href={`${g.base}/${r.slug}`}
                      className={`${chipBase} ring-1 ring-transparent hover:ring-green-light`}
                    >
                      {r.name ?? r._id}
                    </Link>
                  ) : (
                    <span className={`${chipBase} text-header`}>
                      {r.name ?? r._id}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}
