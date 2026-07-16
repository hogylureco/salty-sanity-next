import Link from 'next/link'

/** Gear card shape — from the `gearProjection` deref in spotBySlugQuery. */
export interface GearItem {
  _id: string
  name: string | null
  slug: string | null
  imageURL: string | null
  websiteLink: string | null
}

function GearCard({ g }: { g: GearItem }) {
  const href = g.slug ? `/lures/${g.slug}` : g.websiteLink ?? null
  const external = !g.slug && !!g.websiteLink
  const inner = (
    <div className="flex items-center gap-3 rounded-[5px] border border-body bg-body/50 p-2 transition-colors hover:border-green-light">
      {g.imageURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={g.imageURL}
          alt=""
          loading="lazy"
          className="h-10 w-10 flex-shrink-0 rounded object-cover"
        />
      ) : (
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-body text-header">
          🎣
        </span>
      )}
      <span className="min-w-0 flex-1 truncate font-sans text-sm text-ink">
        {g.name ?? g._id}
      </span>
    </div>
  )
  if (!href) return inner
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {inner}
    </a>
  ) : (
    <Link href={href}>{inner}</Link>
  )
}

/**
 * Gear Used At This Spot. Two layouts from one component:
 * - `rail` (default): the right-rail teaser, capped at `max` (2–3) with a link
 *   to the full set.
 * - `grid`: the Gear tab's fuller responsive grid showing every resolved item.
 * Null-guarded; empty state when no gear refs resolve (all dangle on many spots).
 */
export function GearRail({
  items,
  variant = 'rail',
  max = 3,
}: {
  items: Array<GearItem | null> | null
  variant?: 'rail' | 'grid'
  max?: number
}) {
  const gear = (items ?? []).filter((g): g is GearItem => g != null)
  const isGrid = variant === 'grid'
  const shown = isGrid ? gear : gear.slice(0, max)
  const overflow = isGrid ? 0 : gear.length - shown.length

  return (
    <section aria-labelledby={`gear-${variant}`}>
      <h2
        id={`gear-${variant}`}
        className="font-mono text-xs font-semibold uppercase tracking-wider text-header"
      >
        Gear Used At This Spot
      </h2>
      <hr className="my-3 border-body" />

      {shown.length === 0 ? (
        <p className="text-sm text-[#535c71]">No items found.</p>
      ) : (
        <ul
          className={
            isGrid ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3' : 'space-y-2'
          }
        >
          {shown.map((g) => (
            <li key={g._id}>
              <GearCard g={g} />
            </li>
          ))}
        </ul>
      )}

      {overflow > 0 && (
        <Link
          href="#gear"
          className="mt-3 inline-block font-mono text-xs font-semibold text-green-dark hover:underline"
        >
          +{overflow} more — see Gear tab →
        </Link>
      )}
    </section>
  )
}
