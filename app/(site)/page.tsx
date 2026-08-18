import type { Metadata } from 'next'
import Link from 'next/link'

import { stegaClean } from '@sanity/client/stega'

import { HowToCard } from '@/components/home/HowToCard'
import { SpeciesChips } from '@/components/home/SpeciesChips'
import { SpotCard, type SpotCardData } from '@/components/SpotCard'
import { VideoCard } from '@/components/video/VideoCard'
import { sanityFetch } from '@/lib/sanity/client'
import { homepageSeasonQuery } from '@/lib/sanity/queries'
import { HOMEPAGE_SEASON, type SeasonSpecies } from '@/lib/homepage-season'
import { bothIdForms } from '@/lib/taxonomy'
import { formatVideoDate, videoHref, youtubeThumb } from '@/lib/video'
import type { HomepageSeasonQueryResult } from '@/sanity.types'

// Static + hourly ISR. The three content tags let a Sanity webhook revalidate the
// homepage the moment a video/spot/speciesPost is (re)tagged — no redeploy.
export const revalidate = 3600

const season = HOMEPAGE_SEASON

// Season copy (incl. SEO) is config-driven, so metadata never drifts from the page.
export function generateMetadata(): Metadata {
  return {
    title: season.metaTitle,
    description: season.metaDescription,
  }
}

// Ref → season-species lookup, built once. Weak refs may store either id form, so
// index both. Used to turn a card's matched `_ref`s into ordered species chips.
const SPECIES_BY_REF = new Map<string, SeasonSpecies>()
for (const s of season.species) {
  for (const form of bothIdForms(s.id)) SPECIES_BY_REF.set(form, s)
}

/**
 * Map a card's raw matched species refs back to the season's species, in config
 * order (Striper → Albie → Bonito) for visual consistency. `stegaClean` is applied
 * because these strings feed an equality comparison (map lookup). Null-guards the
 * array and every element, and dedupes.
 */
function speciesFromRefs(refs: Array<string | null> | null): SeasonSpecies[] {
  const hits = new Set<string>()
  for (const raw of refs ?? []) {
    if (!raw) continue
    const match = SPECIES_BY_REF.get(stegaClean(raw))
    if (match) hits.add(match.id)
  }
  return season.species.filter((s) => hits.has(s.id))
}

/** Section shell: eyebrow heading + a "View all" link + the grid. */
function Section({
  title,
  viewAllHref,
  viewAllLabel,
  children,
}: {
  title: string
  viewAllHref: string
  viewAllLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="shrink-0 font-mono text-xs font-semibold text-green-dark hover:underline"
        >
          {viewAllLabel} →
        </Link>
      </div>
      {children}
    </section>
  )
}

export default async function HomePage() {
  const speciesIds = season.species.flatMap((s) => bothIdForms(s.id))
  const data = (await sanityFetch({
    query: homepageSeasonQuery,
    params: { speciesIds },
    // One tag per content type the sections draw from — a (re)tagged doc of any of
    // these invalidates the homepage via revalidateTag.
    tags: ['video', 'spot', 'speciesPost'],
  })) as HomepageSeasonQueryResult

  // --- Videos: newest-first, sliced to the section count. `stegaClean` on every
  //     string that enters a URL (slug, videoID, watchURL, region slug). ---
  const videoItems = (data.videos ?? [])
    .map((v) => {
      const slug = v.slug ? stegaClean(v.slug) : null
      const videoID = v.videoID ? stegaClean(v.videoID) : null
      const watchURL = v.watchURL ? stegaClean(v.watchURL) : null
      const internalHref = slug ? `/videos/${slug}` : null
      const href = internalHref ?? videoHref(watchURL, videoID)
      if (!href) return null
      return {
        key: v._id,
        species: speciesFromRefs(v.speciesRefs),
        props: {
          title: v.title ?? 'Untitled video',
          date: formatVideoDate(v.videoFilmDate),
          regionName: v.region?.name ?? null,
          regionSlug: v.region?.slug ? stegaClean(v.region.slug) : null,
          thumbnailUrl: youtubeThumb(videoID),
          href,
          external: internalHref === null,
        },
      }
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
    .slice(0, season.counts.videos)

  // --- Spots: reuse SpotCard. `id` feeds region derivation (logic) and `slug`
  //     builds the URL, so both are stega-cleaned before the card sees them. ---
  const spotItems = (data.spots ?? [])
    .slice(0, season.counts.spots)
    .map((s) => ({
      key: s._id,
      species: speciesFromRefs(s.speciesRefs),
      spot: {
        _id: s._id,
        name: s.name,
        id: s.id ? stegaClean(s.id) : null,
        slug: s.slug ? stegaClean(s.slug) : null,
        summary: s.summary ?? null,
      } satisfies SpotCardData,
    }))

  // --- How-tos: speciesPost text cards. `slug` builds the URL → stega-cleaned. ---
  const howToItems = (data.howTos ?? [])
    .slice(0, season.counts.howTos)
    .map((h) => ({
      key: h._id,
      title: h.name ?? 'Untitled guide',
      slug: h.slug ? stegaClean(h.slug) : null,
      excerpt: h.excerpt ?? null,
      species: speciesFromRefs(h.speciesRefs),
    }))

  const gridClass = 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3'
  const emptyClass = 'text-sm text-header/70'

  return (
    <main className="mx-auto w-full max-w-6xl space-y-12 px-4 py-8">
      {/* --- Hero: seasonal framing, typographic (no reliable Sanity imagery). --- */}
      <section className="border-b border-body pb-8">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-green-dark">
          {season.eyebrow}
        </p>
        <h1 className="mt-2 font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          {season.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink">
          {season.intro}
        </p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {season.species.map((s) => (
            <li key={s.id}>
              <Link
                href={`/species/${s.slug}`}
                className="inline-block rounded-[5px] bg-body px-3 py-1 font-mono text-sm text-header ring-1 ring-transparent transition-colors hover:ring-green-light"
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* --- Featured Videos --- */}
      <Section title="Featured Videos" viewAllHref="/videos" viewAllLabel="All videos">
        {videoItems.length === 0 ? (
          <p className={emptyClass}>No featured videos this season yet.</p>
        ) : (
          <div className={gridClass}>
            {videoItems.map((item) => (
              <div key={item.key} className="flex flex-col gap-2">
                <VideoCard {...item.props} />
                <SpeciesChips species={item.species} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* --- Featured Spots --- */}
      <Section title="Featured Spots" viewAllHref="/spots" viewAllLabel="All spots">
        {spotItems.length === 0 ? (
          <p className={emptyClass}>No featured spots this season yet.</p>
        ) : (
          <div className={gridClass}>
            {spotItems.map((item) => (
              <div key={item.key} className="flex flex-col gap-2">
                <SpotCard spot={item.spot} />
                <SpeciesChips species={item.species} />
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* --- Featured How-To --- */}
      <Section
        title="Featured How-To"
        viewAllHref="/species"
        viewAllLabel="All guides"
      >
        {howToItems.length === 0 ? (
          <p className={emptyClass}>No featured guides this season yet.</p>
        ) : (
          <div className={gridClass}>
            {howToItems.map((item) => (
              <HowToCard
                key={item.key}
                title={item.title}
                slug={item.slug}
                excerpt={item.excerpt}
                species={item.species}
              />
            ))}
          </div>
        )}
      </Section>
    </main>
  )
}
