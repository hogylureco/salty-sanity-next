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
 * Gear cards from one component, three layouts:
 * - `rail` (default): the right-rail teaser, capped at `max` (2–3) with a link
 *   to the full set.
 * - `grid`: the Gear tab's fuller responsive grid showing every resolved item.
 * - `slider`: a horizontal, snap-scrolling row (e.g. under the video player).
 * Null-guarded; empty state when no gear refs resolve. `title` overrides the
 * heading (e.g. "Gear In This Video").
 */
export function GearRail({
  items,
  variant = 'rail',
  max = 3,
  title = 'Gear Used At This Spot',
}: {
  items: Array<GearItem | null> | null
  variant?: 'rail' | 'grid' | 'slider'
  max?: number
  title?: string
}) {
  const gear = (items ?? []).filter((g): g is GearItem => g != null)
  const isGrid = variant === 'grid'
  const isSlider = variant === 'slider'
  const shown = isGrid || isSlider ? gear : gear.slice(0, max)
  const overflow = isGrid || isSlider ? 0 : gear.length - shown.length

  return (
    <section aria-labelledby={`gear-${variant}`}>
      <h2
        id={`gear-${variant}`}
        className="font-mono text-xs font-semibold uppercase tracking-wider text-header"
      >
        {title}
      </h2>
      <hr className="my-3 border-body" />

      {shown.length === 0 ? (
        <p className="text-sm text-[#535c71]">No items found.</p>
      ) : (
        <ul
          className={
            isGrid
              ? 'grid gap-2 sm:grid-cols-2 lg:grid-cols-3'
              : isSlider
                ? '-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2'
                : 'space-y-2'
          }
        >
          {shown.map((g) => (
            <li
              key={g._id}
              className={isSlider ? 'w-56 shrink-0 snap-start' : undefined}
            >
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
