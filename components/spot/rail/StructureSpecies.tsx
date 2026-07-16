import Link from 'next/link'

/** Minimal ref shape shared by the species / baitfish / structure lists. */
export interface RailRef {
  _id: string
  name: string | null
  slug: string | null
}

/** Red link treatment (#c44), underline on hover — matches the brief. */
const linkClass =
  'text-red-dark hover:underline underline-offset-2'

function LinkList({
  label,
  base,
  items,
}: {
  label: string
  base: string
  items: Array<RailRef | null> | null
}) {
  const resolved = (items ?? []).filter((r): r is RailRef => r != null)
  return (
    <div>
      <p className="font-mono text-xs font-semibold uppercase tracking-wide text-header">
        {label}
      </p>
      {resolved.length === 0 ? (
        <p className="mt-1 text-sm text-header">No items found.</p>
      ) : (
        <ul className="mt-1 space-y-0.5">
          {resolved.map((r) => (
            <li key={r._id} className="text-sm">
              {r.slug ? (
                <Link href={`${base}/${r.slug}`} className={linkClass}>
                  {r.name ?? r._id}
                </Link>
              ) : (
                <span className="text-ink">{r.name ?? r._id}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function StructureSpecies({
  depthRange,
  targetSpecies,
  baitfish,
  structures,
}: {
  depthRange: string | null
  targetSpecies: Array<RailRef | null> | null
  baitfish: Array<RailRef | null> | null
  structures: Array<RailRef | null> | null
}) {
  return (
    <section aria-labelledby="rail-structure" className="space-y-4">
      <div>
        <h2
          id="rail-structure"
          className="font-mono text-xs font-semibold uppercase tracking-wider text-header"
        >
          Structure &amp; Species
        </h2>
        <hr className="my-3 border-body" />
        <p className="font-mono text-xs font-semibold uppercase tracking-wide text-header">
          Depth Range
        </p>
        <p className="mt-1 font-mono text-sm text-ink">{depthRange || '—'}</p>
      </div>

      <LinkList label="Target Species" base="/species" items={targetSpecies} />
      <LinkList label="Baitfish" base="/baitfish" items={baitfish} />
      <LinkList label="Structure" base="/structures" items={structures} />
    </section>
  )
}
