import Link from 'next/link'

/**
 * A row of species tag chips. Each chip links to /species/[slug] when a slug is
 * known, otherwise renders inert. Pure/presentational — the homepage maps a card's
 * matched species refs back to the season config and passes the resolved species
 * in. `#64ffda` (green-light) is used ONLY as a hover ring, never as text on white
 * (which would fail contrast); chip text is `text-header` on `bg-body`.
 */
export interface SpeciesChip {
  name: string
  slug: string | null
}

export function SpeciesChips({ species }: { species: SpeciesChip[] }) {
  if (species.length === 0) return null
  const chip =
    'inline-block rounded-[5px] bg-body px-2 py-0.5 font-mono text-xs text-header'
  return (
    <ul className="flex flex-wrap gap-1.5">
      {species.map((s) => (
        <li key={s.slug ?? s.name}>
          {s.slug ? (
            <Link
              href={`/species/${s.slug}`}
              className={`${chip} ring-1 ring-transparent transition-colors hover:ring-green-light`}
            >
              {s.name}
            </Link>
          ) : (
            <span className={chip}>{s.name}</span>
          )}
        </li>
      ))}
    </ul>
  )
}
