/**
 * Seasonal homepage configuration. The homepage is tag-driven: it pulls content
 * that carries these species' `targetSpecies` references and never names specific
 * documents. Rotating the homepage to another season (October tautog + late
 * albies, say) is a change to THIS file only — copy, the species list, and the
 * per-section counts all live here, and both the page and its metadata read from
 * it. No Sanity schema or documents are involved.
 *
 * Species ids are the published `targetSpecies` `_id`s. Weak references store the
 * plain (published) id, but the drafts perspective can also carry a `drafts.`-
 * prefixed form, so consumers expand each id to BOTH forms (see `bothIdForms` in
 * lib/taxonomy) before matching.
 */
export interface SeasonSpecies {
  /** Display name, verbatim from the `targetSpecies` doc (e.g. "Striped Bass"). */
  name: string
  /** `targetSpecies` slug → /species/[slug]. */
  slug: string
  /** Published `targetSpecies` `_id` (weak refs store the plain id). */
  id: string
}

export interface HomepageSeason {
  /** Stable key for the season (not user-facing). */
  key: string
  /** Small green eyebrow above the H1. */
  eyebrow: string
  /** Hero H1. */
  title: string
  /** Hero body paragraph — Capt. Mike's register: concrete, plain, no hype. */
  intro: string
  /** `<title>` for the homepage. */
  metaTitle: string
  /** Meta description for the homepage. */
  metaDescription: string
  /** The season's target species, in display order. */
  species: SeasonSpecies[]
  /** How many cards each section renders. */
  counts: { videos: number; spots: number; howTos: number }
}

/**
 * September on Cape Cod — the fall run: striped bass, false albacore, bonito.
 * Counts reflect what the dataset actually carries (striper is deep everywhere;
 * bonito videos are the thinnest facet at ~5), so the rails stay populated.
 */
export const HOMEPAGE_SEASON: HomepageSeason = {
  key: 'september-fall-run',
  eyebrow: 'September · The Fall Run',
  title: 'The fall run is on',
  intro:
    'September flips the switch on Cape Cod. Bait pours out of the estuaries and ' +
    'the fall run turns on — striped bass, false albacore, and bonito line up to ' +
    'feed. Cooler water and shorter days push the fish shallow, and they hit hard. ' +
    'Here are the videos, spots, and guides to get you on them this month.',
  metaTitle:
    'Salty Cape — September Fall Run: Striped Bass, False Albacore & Bonito',
  metaDescription:
    'September on Cape Cod means the fall run: striped bass, false albacore, and ' +
    'bonito chasing bait to the beach. Featured videos, spots, and how-to guides ' +
    'for the month.',
  species: [
    {
      name: 'Striped Bass',
      slug: 'striped-bass',
      id: 'e2b94c85-d09b-41a1-9951-c198285beeef',
    },
    {
      name: 'False Albacore',
      slug: 'false-albacore',
      id: 'cd887320-35e2-4c52-9914-c7d1478dac9a',
    },
    {
      name: 'Bonito',
      slug: 'bonito',
      id: 'adc00eba-94f4-4694-8d8c-7f6825e29498',
    },
  ],
  counts: { videos: 6, spots: 6, howTos: 4 },
}
