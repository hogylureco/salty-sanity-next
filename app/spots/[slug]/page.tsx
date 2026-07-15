import { Suspense } from 'react'

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import { SpotConditions } from '@/components/conditions/SpotConditions'
import { SpotMapLoader } from '@/components/map/SpotMapLoader'
import {
  DebugTableDumps,
  type DebugDumpGroup,
} from '@/components/spot/DebugTableDumps'
import { SpotPortableText } from '@/components/portable-text/SpotPortableText'
import { breadcrumbList, placeSchema, type Crumb } from '@/lib/jsonld'
import { sanityFetch } from '@/lib/sanity/client'
import { regionForSpot } from '@/lib/taxonomy'
import {
  allSpotSlugsQuery,
  spotBySlugQuery,
  spotMetaBySlugQuery,
} from '@/lib/sanity/queries'
import type {
  AllSpotSlugsQueryResult,
  SpotBySlugQueryResult,
  SpotMetaBySlugQueryResult,
} from '@/sanity.types'

// ISR: rebuild each spot at most hourly. `dynamicParams = true` means spots not
// in `generateStaticParams` (e.g. published after a build) render on demand
// instead of 404-ing.
//
// NOTE: production builds see only PUBLISHED documents; drafts render in dev via
// the Phase 1 perspective switch (dev client reads `drafts`). Expect the dev
// server to show far more spots than a production build until content is
// published — that is correct behavior, not a bug.
export const revalidate = 3600
export const dynamicParams = true

type Spot = NonNullable<SpotBySlugQueryResult>
type SpotRef = NonNullable<NonNullable<Spot['targetSpecies']>[number]>

// --- Portable Text ------------------------------------------------------------
// Narrative content renders through the shared SpotPortableText map (which owns
// the richTableBlock serializer). The ?debug=1 raw-JSON dump now lives in the
// <DebugTableDumps> client island so this page stays statically rendered.
function NarrativeSection({
  title,
  value,
}: {
  title: string
  value: Spot['captMikeNotes']
}) {
  if (!value || value.length === 0) return null
  return (
    <section className="mt-8 first:mt-0">
      {/* Eyebrow label (the field name): Inconsolata, uppercase, small, #535c71. */}
      <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-header">
        {title}
      </h2>
      <SpotPortableText value={value} />
    </section>
  )
}

// Collect each narrative's richTableBlock members (for the ?debug=1 island).
// Typegen labels the table member `_type: "richTable"`, but the stored value is
// `"richTableBlock"` — cast to the runtime shape to select them.
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

// --- References ---------------------------------------------------------------
// Each of the 17 logical reference fields links to a placeholder taxonomy route
// (routes don't exist yet — dead links are fine). Null items are skipped; an
// empty/null array renders "— none —" so every field is visually audited.
function ReferenceSection({
  label,
  base,
  items,
}: {
  label: string
  base: string
  items: Array<SpotRef | null> | null
}) {
  const resolved = (items ?? []).filter((it): it is SpotRef => it != null)
  const chipBase =
    'inline-block rounded-[5px] bg-body px-2 py-1 font-mono text-xs'
  return (
    <section className="mb-4">
      <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-wider text-header">
        {label}
      </h3>
      {resolved.length === 0 ? (
        <p className="text-sm text-header">— none —</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {resolved.map((it) => (
            <li key={it._id}>
              {it.slug ? (
                <Link
                  href={`${base}/${it.slug}`}
                  className={`${chipBase} ring-1 ring-transparent hover:ring-green-light`}
                >
                  {it.name ?? it._id}
                </Link>
              ) : (
                <span className={`${chipBase} text-header`}>
                  {it.name ?? it._id} (no slug)
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function scalar(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—'
  return String(value)
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

  // Scalar / metadata fields for the definition-list dump.
  const scalars: Array<{ label: string; node: React.ReactNode }> = [
    { label: 'name', node: scalar(spot.name) },
    { label: 'id', node: <code>{spot.id ?? '—'}</code> },
    { label: 'slug', node: scalar(spot.slug) },
    { label: '_id', node: <code>{spot._id}</code> },
    { label: '_type', node: scalar(spot._type) },
    { label: '_createdAt', node: scalar(spot._createdAt) },
    { label: '_updatedAt', node: scalar(spot._updatedAt) },
    { label: 'spotId', node: scalar(spot.spotId) },
    { label: 'postType', node: scalar(spot.postType) },
    { label: 'spotType', node: scalar(spot.spotType) },
    { label: 'version', node: scalar(spot.version) },
    { label: 'publishDate', node: scalar(spot.publishDate) },
    { label: 'depthRange', node: scalar(spot.depthRange) },
    { label: 'hazards', node: scalar(spot.hazards) },
    { label: 'approachCodePrefix', node: scalar(spot.approachCodePrefix) },
    { label: 'approachCount', node: scalar(spot.approachCount) },
    { label: 'microSeasons', node: scalar(spot.microSeasons) },
    { label: 'latitude', node: scalar(spot.latitude) },
    { label: 'longitude', node: scalar(spot.longitude) },
    { label: 'zoomLevel', node: scalar(spot.zoomLevel) },
    { label: 'macroRegion', node: scalar(spot.macroRegion) },
    { label: 'platform', node: scalar(spot.platform) },
    { label: 'tideStationId', node: scalar(spot.tideStationId) },
    { label: 'currentStationId', node: scalar(spot.currentStationId) },
    { label: 'tideVariance', node: scalar(spot.tideVariance) },
    { label: 'gpxFile', node: scalar(spot.gpxFile) },
  ]

  // The 17 logical reference fields → placeholder taxonomy routes.
  const references: Array<{
    label: string
    base: string
    items: Array<SpotRef | null> | null
  }> = [
    { label: 'approaches', base: '/approaches', items: spot.approaches },
    { label: 'baitfish', base: '/baitfish', items: spot.baitfish },
    { label: 'lureCatalog', base: '/lures', items: spot.lureCatalog },
    { label: 'lureGearCategory', base: '/gear', items: spot.lureGearCategory },
    { label: 'microSeason', base: '/micro-seasons', items: spot.microSeason },
    { label: 'mode', base: '/modes', items: spot.mode },
    { label: 'parentLure', base: '/parent-lures', items: spot.parentLure },
    { label: 'region', base: '/regions', items: spot.region },
    { label: 'seasons', base: '/seasons', items: spot.seasons },
    { label: 'structureTypes', base: '/structures', items: spot.structureTypes },
    { label: 'targetSpecies', base: '/species', items: spot.targetSpecies },
    { label: 'techniqueRetrieve', base: '/techniques', items: spot.techniqueRetrieve },
    { label: 'zone', base: '/zones', items: spot.zone },
    { label: 'relatedVideos', base: '/videos', items: spot.relatedVideos },
    { label: 'boatRamps', base: '/spots', items: spot.boatRamps },
    { label: 'nearbySpots', base: '/spots', items: spot.nearbySpots },
    { label: 'subSpotsFXApproaches', base: '/spots', items: spot.subSpotsFXApproaches },
  ]

  const region = regionForSpot(
    spot.id,
    spot.region?.[0]?.name,
    spot.region?.[0]?.slug,
  )

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        {/* Breadcrumb/region line: Inconsolata, uppercase. */}
        <p className="font-mono text-xs uppercase tracking-wider text-header">
          <Link href="/spots" className="hover:text-green-dark">
            Spots
          </Link>
          {' / '}
          {region.slug ? (
            <Link
              href={`/regions/${region.slug}`}
              className="hover:text-green-dark"
            >
              {region.name}
            </Link>
          ) : (
            region.name
          )}
        </p>
        {/* H1 hero in Inconsolata 700; the id beneath as an intentional signature. */}
        <h1 className="font-mono text-3xl font-bold leading-tight text-header sm:text-4xl">
          {spot.name ?? spot.id ?? spot._id}
        </h1>
        {spot.id && <p className="font-mono text-sm text-header">{spot.id}</p>}
      </header>

      {/* Map bleeds to the Box edge (padding 0, clipped to the 5px radius). */}
      <div className="box overflow-hidden p-0">
        <SpotMapLoader
          lat={spot.latitude}
          lng={spot.longitude}
          name={spot.name ?? spot.id ?? spot._id}
          zoom={spot.zoomLevel ?? undefined}
        />
      </div>

      <div className="box">
        <SpotConditions
          spotId={spot._id}
          tideStationId={spot.tideStationId}
          currentStationId={spot.currentStationId}
        />
      </div>

      <section className="box">
        <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-header">
          Fields
        </h2>
        <dl className="divide-y divide-body">
          {scalars.map(({ label, node }) => (
            <div key={label} className="flex flex-wrap gap-x-3 py-1">
              <dt className="min-w-[11rem] font-mono text-xs uppercase tracking-wide text-header">
                {label}
              </dt>
              <dd className="text-sm">{node}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="box">
        <h2 className="mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-header">
          featuredImage
        </h2>
        {spot.featuredImage?.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={spot.featuredImage.url}
            alt={spot.featuredImage.alt ?? ''}
            className="max-w-full rounded-[5px]"
          />
        ) : (
          <p className="text-sm text-header">— none —</p>
        )}
        <dl className="mt-2 divide-y divide-body">
          <div className="flex flex-wrap gap-x-3 py-1">
            <dt className="min-w-[11rem] font-mono text-xs uppercase tracking-wide text-header">
              alt
            </dt>
            <dd className="text-sm">{scalar(spot.featuredImage?.alt)}</dd>
          </div>
          <div className="flex flex-wrap gap-x-3 py-1">
            <dt className="min-w-[11rem] font-mono text-xs uppercase tracking-wide text-header">
              caption
            </dt>
            <dd className="text-sm">{scalar(spot.featuredImage?.caption)}</dd>
          </div>
        </dl>
      </section>

      {/* All 7 narratives + spotCard in ONE Box with internal rhythm — 7 stacked
          box shadows read as visual noise at 25px padding, so: one Box, section
          spacing between fields. (Box-per-section decision, per the brief.) */}
      <div className="box">
        <NarrativeSection title="spotCard" value={spot.spotCard} />
        <NarrativeSection title="captMikeNotes" value={spot.captMikeNotes} />
        <NarrativeSection title="historicalAnalysis" value={spot.historicalAnalysis} />
        <NarrativeSection title="environmentalFactors" value={spot.environmentalFactors} />
        <NarrativeSection title="observationalFactors" value={spot.observationalFactors} />
        <NarrativeSection title="structureApproach" value={spot.structureApproach} />
        <NarrativeSection title="gearTechnique" value={spot.gearTechnique} />
        <NarrativeSection title="QAcaptMike" value={spot.QAcaptMike} />
      </div>

      {/* Reference chips, grouped near the end. */}
      <div className="box">
        <h2 className="mb-4 font-mono text-sm font-semibold uppercase tracking-wider text-header">
          Related
        </h2>
        {references.map((ref) => (
          <ReferenceSection
            key={ref.label}
            label={ref.label}
            base={ref.base}
            items={ref.items}
          />
        ))}
      </div>

      {/* Client island: renders the ?debug=1 JSON dump without opting the page
          out of static rendering. Suspense keeps prerendering static. */}
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
          // Keep JSON-LD lean — the full narrative would bloat every page.
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
