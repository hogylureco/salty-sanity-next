import Link from 'next/link'

import { SpeciesChips, type SpeciesChip } from '@/components/home/SpeciesChips'

/**
 * Presentational how-to card for a `speciesPost` guide. PURE — the homepage
 * derives the excerpt (first ~45 words, from the query) and the resolved species
 * chips. `speciesPost` has no image or date, so this is a text card on the brand
 * `.box`: Inconsolata title / IBM Plex excerpt / species chips. Links to the
 * article at /species/posts/[slug]; a slugless post renders inert.
 */
export interface HowToCardData {
  title: string
  slug: string | null
  excerpt: string | null
  species: SpeciesChip[]
}

function truncate(text: string, max = 200): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > max ? `${clean.slice(0, max).trimEnd()}…` : clean
}

export function HowToCard({ title, slug, excerpt, species }: HowToCardData) {
  return (
    <article className="box flex flex-col gap-2">
      <h3 className="font-mono text-lg font-semibold leading-snug text-header">
        {slug ? (
          <Link
            href={`/species/posts/${slug}`}
            className="hover:text-green-dark"
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>
      {excerpt && (
        <p className="text-sm leading-relaxed">{truncate(excerpt)}</p>
      )}
      {species.length > 0 && (
        <div className="mt-1">
          <SpeciesChips species={species} />
        </div>
      )}
    </article>
  )
}
