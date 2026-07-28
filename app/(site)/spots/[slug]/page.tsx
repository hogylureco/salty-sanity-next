import { Suspense, type ReactNode } from 'react'

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import { SpotMapLoader } from '@/components/map/SpotMapLoader'
import { PeakTidesToday } from '@/components/spot/dashboard/PeakTidesToday'
import { GearRail, type GearItem } from '@/components/spot/rail/GearRail'
import { MoreAboutSpot, type ChipGroup } from '@/components/spot/rail/MoreAboutSpot'
import {
  StructureSpecies,
  type RailRef,
} from '@/components/spot/rail/StructureSpecies'
import { SectionBox } from '@/components/spot/SectionBox'
import { SpotTabs, type TabPanel } from '@/components/spot/SpotTabs'
import { SpotToc } from '@/components/spot/SpotToc'
import { SevenDayPeakWindows } from '@/components/spot/tabs/SevenDayPeakWindows'
import { ExtendedForecast } from '@/components/spot/tabs/ExtendedForecast'
import { SstChart } from '@/components/spot/tabs/SstChart'
import { WindyEmbed } from '@/components/spot/tabs/WindyEmbed'
import {
  DebugTableDumps,
  type DebugDumpGroup,
} from '@/components/spot/DebugTableDumps'
import { SpotApproaches } from '@/components/spot/SpotApproaches'
import { SpotPortableText } from '@/components/portable-text/SpotPortableText'
import { SpotCard, type SpotCardData } from '@/components/SpotCard'
import { VideoCard } from '@/components/video/VideoCard'
import { breadcrumbList, placeSchema, type Crumb } from '@/lib/jsonld'
import { sanityFetch } from '@/lib/sanity/client'
import { buildNearbyMarkers } from '@/lib/nearby'
import { hasPortableText, headingsOf, type TocEntry } from '@/lib/spot-sections'
import { bothIdForms, regionForSpot } from '@/lib/taxonomy'
import { formatVideoDate, videoHref, youtubeThumb } from '@/lib/video'
import {
  allSpotSlugsQuery,
  relatedVideosForSpotQuery,
  spotBySlugQuery,
  spotMetaBySlugQuery,
} from '@/lib/sanity/queries'
import type {
  AllSpotSlugsQueryResult,
  RelatedVideosForSpotQueryResult,
  SpotBySlugQueryResult,
  SpotMetaBySlugQueryResult,
} from '@/sanity.types'

export const revalidate = 3600
export const dynamicParams = true

type Spot = NonNullable<SpotBySlugQueryResult>

// --- Small render helpers ------------------------------------------------------

/** Filter a weak-ref array to the items that actually resolved. */
function resolved<T>(items: Array<T | null> | null | undefined): T[] {
  return (items ?? []).filter((it): it is T => it != null)
}

/** Display label for a raw spotType. `fs-featured-spot` is branded "Inshore Boat
 *  Spot"; anything else is title-cased from its slug (a raw slug isn't display-
 *  ready). */
function formatSpotType(raw: string | null): string | null {
  if (!raw) return null
  const known: Record<string, string> = {
    'fs-featured-spot': 'Inshore Boat Spot',
  }
  if (known[raw]) return known[raw]
  return raw
    .replace(/^fs-/, '')
    .split('-')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/** Coordinates formatted to 6 decimals, per the original hero. */
function formatCoords(lat: number | null, lng: number | null): string | null {
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
}

/** A wrap of reference chips → taxonomy links (or inert chips when no route). */
function RefLinks({
  items,
  base,
}: {
  items: Array<RailRef | null> | null
  base: string | null
}) {
  const list = resolved(items)
  if (list.length === 0) {
    return <p className="text-sm text-[#535c71]">No items found.</p>
  }
  const chip = 'inline-block rounded-[5px] bg-body px-2 py-1 font-mono text-xs'
  return (
    <ul className="flex flex-wrap gap-2">
      {list.map((r) => (
        <li key={r._id}>
          {base && r.slug ? (
            <Link
              href={`${base}/${r.slug}`}
              className={`${chip} ring-1 ring-transparent hover:ring-green-light`}
            >
              {r.name ?? r._id}
            </Link>
          ) : (
            <span className={`${chip} text-header`}>{r.name ?? r._id}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

/** Labelled sub-block inside a mixed section (e.g. Approach Routing → Approaches). */
function SubBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-6 first:mt-0">
      <p className="mb-2 font-mono text-xs font-semibold uppercase tracking-wide text-header">
        {label}
      </p>
      {children}
    </div>
  )
}

// Collect each narrative's richTableBlock members (for the ?debug=1 island).
function collectDebugGroups(spot: Spot): DebugDumpGroup[] {
  const narratives: Array<[string, Spot['captMikeNotes']]> = [
    ['spotCard', spot.spotCard],
    ['captMikeNotes', spot.captMikeNotes],
    ['historicalAnalysis', spot.historicalAnalysis],
    ['environmentalFactors', spot.environmentalFactors],
    ['observationalFactors', spot.observationalFactors],
    ['structureApproach', spot.structureApproach],
    ['gearTechnique', spot.gearTechnique],
    ['QAcaptMike', spot.QAcaptMike],
  ]
  return narratives
    .map(([field, value]) => ({
      field,
      blocks: ((value ?? []) as Array<{ _type: string; _key?: string }>).filter(
        (block) => block._type === 'richTableBlock',
      ),
    }))
    .filter((group) => group.blocks.length > 0)
}

// --- Static params + metadata -------------------------------------------------
export async function generateStaticParams() {
  const slugs = (await sanityFetch({
    query: allSpotSlugsQuery,
    tags: ['spot'],
  })) as AllSpotSlugsQueryResult
  return slugs
    .filter((s): s is { slug: string; id: string | null } => Boolean(s.slug))
    .map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const meta = (await sanityFetch({
    query: spotMetaBySlugQuery,
    params: { slug },
    tags: ['spot', `spot:${slug}`],
  })) as SpotMetaBySlugQueryResult
  if (!meta) return {}
  const description = meta.excerpt
    ? meta.excerpt.replace(/\s+/g, ' ').trim().slice(0, 155)
    : undefined
  return { title: meta.name ?? 'Spot', description }
}

// --- Page ---------------------------------------------------------------------
export default async function SpotPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const spot = (await sanityFetch({
    query: spotBySlugQuery,
    params: { slug },
    tags: ['spot', `spot:${slug}`],
  })) as SpotBySlugQueryResult

  if (!spot) notFound()

  // Related videos (approved ranking). Params from the spot's own ids/refs, each
  // in both id forms so the weak/`drafts.`-prefixed refs match.
  const spotIds = bothIdForms(spot._id)
  const regionRefs = spot.regionRef ? bothIdForms(spot.regionRef) : []
  const speciesRefs = (spot.targetSpeciesRefs ?? [])
    .filter((r): r is string => Boolean(r))
    .flatMap(bothIdForms)
  const relatedVideos = (await sanityFetch({
    query: relatedVideosForSpotQuery,
    params: { spotIds, regionRefs, speciesRefs },
    tags: [`spot:${slug}`, 'video'],
  })) as RelatedVideosForSpotQueryResult

  const title = spot.name ?? spot.id ?? spot._id
  const region = regionForSpot(
    spot.id,
    spot.region?.[0]?.name,
    spot.region?.[0]?.slug,
  )
  const spotTypeLabel = formatSpotType(spot.spotType)
  const coords = formatCoords(spot.latitude, spot.longitude)

  // --- Overview section registry: ONE array drives both the TOC and the Boxes.
  //     These are the 7 always-visible narrative sections; supplementary content
  //     (videos, conditions, gear grid, nearby) lives in the other tabs.
  type Section = {
    id: string
    title: string
    icon: string
    hasContent: boolean
    subs: TocEntry['subs']
    body: ReactNode
  }

  const sections: Section[] = [
    {
      id: 'sec-field-notes',
      title: "Capt. Mike's Field Notes",
      icon: '📝',
      hasContent: hasPortableText(spot.captMikeNotes),
      subs: headingsOf(spot.captMikeNotes),
      body: <SpotPortableText value={spot.captMikeNotes} />,
    },
    {
      id: 'sec-approaches',
      title: 'Approaches',
      icon: '🗺️',
      hasContent: resolved(spot.approaches).length > 0,
      subs: [],
      body: <SpotApproaches approaches={spot.approaches} />,
    },
    {
      id: 'sec-seasonal-historical',
      title: 'Seasonal & Historical Analysis',
      icon: '📅',
      hasContent: hasPortableText(spot.historicalAnalysis),
      subs: headingsOf(spot.historicalAnalysis),
      body: <SpotPortableText value={spot.historicalAnalysis} />,
    },
    {
      id: 'sec-approach-routing',
      title: 'Approach Routing',
      icon: '🧭',
      hasContent:
        hasPortableText(spot.structureApproach) ||
        resolved(spot.approaches).length > 0 ||
        resolved(spot.subSpotsFXApproaches).length > 0,
      subs: headingsOf(spot.structureApproach),
      body: (
        <>
          <SpotPortableText value={spot.structureApproach} />
          <SubBlock label="Approaches">
            <RefLinks items={spot.approaches} base="/approaches" />
          </SubBlock>
          <SubBlock label="Sub-spots & FX Approaches">
            <RefLinks items={spot.subSpotsFXApproaches} base="/spots" />
          </SubBlock>
        </>
      ),
    },
    {
      id: 'sec-gear-technique',
      title: 'Gear & Technique',
      icon: '🎣',
      hasContent: hasPortableText(spot.gearTechnique),
      subs: headingsOf(spot.gearTechnique),
      body: <SpotPortableText value={spot.gearTechnique} />,
    },
    {
      id: 'sec-environmental',
      title: 'Environmental Factors',
      icon: '🌊',
      hasContent: hasPortableText(spot.environmentalFactors),
      subs: headingsOf(spot.environmentalFactors),
      body: <SpotPortableText value={spot.environmentalFactors} />,
    },
    {
      id: 'sec-observational',
      title: 'Observational Factors: B.A.S.E.',
      icon: '👁',
      hasContent: hasPortableText(spot.observationalFactors),
      subs: headingsOf(spot.observationalFactors),
      body: <SpotPortableText value={spot.observationalFactors} />,
    },
    {
      id: 'sec-qa',
      title: 'Q&A with Capt. Mike',
      icon: '❓',
      hasContent: hasPortableText(spot.QAcaptMike),
      subs: headingsOf(spot.QAcaptMike, ['h3']),
      body: <SpotPortableText value={spot.QAcaptMike} />,
    },
  ]

  const tocEntries: TocEntry[] = sections.map((s) => ({
    id: s.id,
    title: s.title,
    hasContent: s.hasContent,
    subs: s.subs,
  }))

  // Reference fields not surfaced by a section, rail, or tab → audit-safety block.
  const moreGroups: ChipGroup[] = [
    { label: 'Lure Gear Category', base: '/gear', items: spot.lureGearCategory },
    { label: 'Parent Lure', base: '/parent-lures', items: spot.parentLure },
    { label: 'Technique / Retrieve', base: '/techniques', items: spot.techniqueRetrieve },
    { label: 'Mode', base: null, items: spot.mode },
    { label: 'Zone', base: '/zones', items: spot.zone },
    { label: 'Boat Ramps', base: '/spots', items: spot.boatRamps },
  ]

  const nearby = resolved(spot.nearbySpots) as SpotCardData[]

  // Nearby markers for the dashboard chart, built server-side (keeps the page
  // static). Same curated `nearbySpots` source as the tab; null-guarded and
  // stega-cleaned in lib/nearby.
  const nearbyMap = buildNearbyMarkers(
    { id: spot.id, latitude: spot.latitude, longitude: spot.longitude },
    spot.nearbySpots,
  )

  // Normalized related-video props (href-validated once), shared by the Overview
  // slider and the Videos tab grid so the two never drift. Cards link to the
  // in-app video page (/videos/[slug]); only a slugless video falls back to its
  // YouTube link (external), which `external` signals to VideoCard.
  const videoItems = relatedVideos
    .map((v) => {
      const internalHref = v.slug ? `/videos/${v.slug}` : null
      const href = internalHref ?? videoHref(v.watchURL, v.videoID)
      if (!href) return null
      return {
        key: v._id,
        title: v.title ?? 'Untitled video',
        date: formatVideoDate(v.videoFilmDate),
        regionName: v.region?.name ?? null,
        regionSlug: v.region?.slug ?? null,
        thumbnailUrl: youtubeThumb(v.videoID),
        href,
        external: internalHref === null,
      }
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)

  // --- Overview panel. Top: the dashboard (peak fishing times today + chart),
  //     moved here from above the tabs. Then a horizontal related-videos slider.
  //     Then the 3-column body (TOC | narrative | rails). The outer wrapper carries
  //     spacing only — no display utility — so the tab wrapper's `hidden` wins.
  const overviewPanel = (
    <div className="space-y-6">
      {/* Dashboard: peak fishing times today + the chart. */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="box">
          <PeakTidesToday
            spotId={spot._id}
            currentStationId={spot.currentStationId}
          />
        </div>
        <div className="box overflow-hidden p-0 md:col-span-2">
          <SpotMapLoader
            lat={spot.latitude}
            lng={spot.longitude}
            name={title}
            zoom={spot.zoomLevel ?? undefined}
            nearby={nearbyMap.markers}
            fitNearbyBounds={nearbyMap.allWithinCap}
          />
        </div>
      </div>

      {/* Related videos — a horizontal, snap-scrolling slider (below the chart /
          peak times). Omitted entirely when there are no playable videos. */}
      {videoItems.length > 0 && (
        <div className="box">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
            Related Videos
          </h2>
          <hr className="my-3 border-body" />
          <ul className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2">
            {videoItems.map(({ key, ...v }) => (
              <li key={key} className="w-64 shrink-0 snap-start sm:w-72">
                <VideoCard {...v} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 3-column body. The grid sits on this child div, NOT the panel wrapper. */}
      <div className="lg:grid lg:grid-cols-[180px_minmax(0,1fr)_260px] lg:items-start lg:gap-6">
        <SpotToc entries={tocEntries} />

        <div className="min-w-0 space-y-6">
          {sections.map((s) => (
            <SectionBox
              key={s.id}
              id={s.id}
              title={s.title}
              icon={s.icon}
              isEmpty={!s.hasContent}
            >
              {s.body}
            </SectionBox>
          ))}
          <MoreAboutSpot groups={moreGroups} />
        </div>

        <aside className="mt-6 space-y-6 lg:mt-0">
          <div className="box">
            <GearRail
              items={spot.lureCatalog as Array<GearItem | null> | null}
              variant="rail"
              max={3}
            />
          </div>
          <div className="box">
            <StructureSpecies
              depthRange={spot.depthRange}
              targetSpecies={spot.targetSpecies}
              baitfish={spot.baitfish}
              approaches={spot.approaches}
            />
          </div>
        </aside>
      </div>
    </div>
  )

  // --- Chart panel: the same chart, on its own full-width tab.
  const chartPanel = (
    <div className="box overflow-hidden p-0">
      <SpotMapLoader
        lat={spot.latitude}
        lng={spot.longitude}
        name={title}
        zoom={spot.zoomLevel ?? undefined}
        nearby={nearbyMap.markers}
        fitNearbyBounds={nearbyMap.allWithinCap}
      />
    </div>
  )

  // --- Videos panel: the full grid (same normalized items as the Overview slider).
  const videosPanel = (
    <div className="box">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
        Related Videos
      </h2>
      <hr className="my-3 border-body" />
      {videoItems.length === 0 ? (
        <p className="text-sm text-[#535c71]">No videos for this spot yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videoItems.map(({ key, ...v }) => (
            <VideoCard key={key} {...v} />
          ))}
        </div>
      )}
    </div>
  )

  // --- Fishing Times panel (7-day peak windows + seasonal windows)
  const fishingTimesPanel = (
    <div className="space-y-6">
      <div className="box">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
          Peak Fishing Times — Next 7 Days
        </h2>
        <hr className="my-3 border-body" />
        <SevenDayPeakWindows
          spotId={spot._id}
          currentStationId={spot.currentStationId}
        />
      </div>
      <div className="box">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
          Seasonal Windows
        </h2>
        <hr className="my-3 border-body" />
        <SubBlock label="Seasons">
          <RefLinks items={spot.seasons} base="/seasons" />
        </SubBlock>
        <SubBlock label="Micro Seasons">
          <RefLinks items={spot.microSeason} base="/micro-seasons" />
        </SubBlock>
      </div>
    </div>
  )

  // --- Gear panel (full grid)
  const gearPanel = (
    <div className="box">
      <GearRail
        items={spot.lureCatalog as Array<GearItem | null> | null}
        variant="grid"
      />
    </div>
  )

  // --- Nearby Spots panel
  const nearbyPanel = (
    <div className="box">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
        Nearby Spots
      </h2>
      <hr className="my-3 border-body" />
      {nearby.length === 0 ? (
        <p className="text-sm text-[#535c71]">No items found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {nearby.map((s) => (
            <SpotCard key={s._id} spot={s} />
          ))}
        </div>
      )}
    </div>
  )

  // --- Playbooks panel (placeholder — feature not built yet)
  const playbooksPanel = (
    <div className="box">
      <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
        Playbooks
      </h2>
      <hr className="my-3 border-body" />
      <p className="text-sm text-[#535c71]">No items found.</p>
      <p className="mt-2 text-sm text-header/70">
        Interactive playbooks for this spot are coming soon.
      </p>
    </div>
  )

  const tabPanels: TabPanel[] = [
    { id: 'overview', label: 'Overview', content: overviewPanel },
    { id: 'chart', label: 'Chart', content: chartPanel },
    { id: 'videos', label: 'Videos', content: videosPanel },
    { id: 'fishing-times', label: 'Fishing Times', content: fishingTimesPanel },
    {
      id: 'weather',
      label: 'Weather',
      content: (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <SstChart
              lat={spot.latitude}
              lng={spot.longitude}
              zoom={spot.zoomLevel ?? undefined}
              name={title}
            />
            <WindyEmbed
              lat={spot.latitude}
              lng={spot.longitude}
              zoom={spot.zoomLevel ?? undefined}
              name={title}
            />
          </div>
          <ExtendedForecast lat={spot.latitude} lng={spot.longitude} />
        </div>
      ),
    },
    { id: 'gear', label: 'Gear', content: gearPanel },
    { id: 'nearby', label: 'Nearby Spots', content: nearbyPanel },
    { id: 'playbooks', label: 'Playbooks', content: playbooksPanel },
  ]

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      {/* --- Hero --- */}
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-header">
          <Link href="/spots" className="hover:text-green-dark">
            Spots
          </Link>
          {' / '}
          {region.slug ? (
            <Link href={`/regions/${region.slug}`} className="hover:text-green-dark">
              {region.name}
            </Link>
          ) : (
            region.name
          )}
        </p>
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          {title}
        </h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-header">
          {spotTypeLabel && <span>{spotTypeLabel}</span>}
          {spotTypeLabel && coords && <span aria-hidden>·</span>}
          {coords && <span>{coords}</span>}
          {(spotTypeLabel || coords) && <span aria-hidden>·</span>}
          {region.slug ? (
            <Link
              href={`/regions/${region.slug}`}
              className="text-green-dark hover:underline"
            >
              {region.name}
            </Link>
          ) : (
            <span className="text-green-dark">{region.name}</span>
          )}
        </p>
        {spot.id && (
          <p className="font-mono text-[0.7rem] text-header/50">{spot.id}</p>
        )}
      </header>

      {/* --- Tabs, directly under the hero. The peak-times + chart dashboard now
          lives inside the Overview tab; the chart also gets its own full-width
          Chart tab. --- */}
      <div className="mt-6">
        <SpotTabs panels={tabPanels} />
      </div>

      {/* Client island: ?debug=1 JSON dump without opting the page out of SSG. */}
      <Suspense fallback={null}>
        <DebugTableDumps groups={collectDebugGroups(spot)} />
      </Suspense>

      <SpotJsonLd spot={spot} />
    </main>
  )
}

// Place (name, geo, description) + BreadcrumbList (Home → Region → Spot).
function SpotJsonLd({ spot }: { spot: Spot }) {
  const title = spot.name ?? spot.id ?? spot._id
  const region = regionForSpot(
    spot.id,
    spot.region?.[0]?.name,
    spot.region?.[0]?.slug,
  )
  const crumbs: Crumb[] = [
    { name: 'Home', path: '/' },
    region.slug
      ? { name: region.name, path: `/regions/${region.slug}` }
      : { name: region.name },
    { name: title },
  ]
  return (
    <>
      <JsonLd
        data={placeSchema({
          name: title,
          description: spot.descriptionText
            ? spot.descriptionText.replace(/\s+/g, ' ').trim().slice(0, 300)
            : null,
          latitude: spot.latitude,
          longitude: spot.longitude,
          url: `/spots/${spot.slug ?? ''}`,
        })}
      />
      <JsonLd data={breadcrumbList(crumbs)} />
    </>
  )
}
