import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import { breadcrumbList } from '@/lib/jsonld'
import { sanityFetch } from '@/lib/sanity/client'
import { systemByZoneQuery } from '@/lib/sanity/queries'
import { SYSTEM_ZONES, SYSTEM_ZONE_BY_SLUG } from '@/lib/system-zones'
import { bothIdForms } from '@/lib/taxonomy'

export const revalidate = 3600
export const dynamicParams = false

/** One taxonomy doc projected by systemByZoneQuery. Image cards carry
 *  `imageUrl`; text cards (observational/environmental) carry `excerpt`. */
interface SystemItem {
  _id: string
  name: string | null
  slug: string | null
  // Route diagram (approach/technique) or product shot (parentLure); null for
  // types that carry no image field.
  imageUrl?: string | null
  // Flattened richText body (observational/environmental), capped to a preview.
  excerpt?: string | null
}

const EXCERPT_LENGTH = 150

/**
 * Editor-curated running order for the two text sections, keyed by system slug.
 * Values are doc slugs in the intended order; any doc NOT listed falls to the
 * end in name order (so a newly-added factor never disappears — it just lands
 * last until it's slotted here). See `orderBySlug`.
 *
 * NOTE on `boat-offshore.environmental`: the docs tagged `environmental` for the
 * offshore zone are actually observational-topic content (Birds, Bait, Whales,
 * Vertical Game…) — the requested Wind/Currents/Barometric/Upwelling/Swell/Eddy
 * environmental docs do not exist in Sanity. This order therefore mirrors the
 * offshore observational running order (same topics) so the section reads
 * intro-first instead of alphabetically; revisit once the data is retagged.
 */
const FACTOR_ORDER: Record<
  string,
  { environmental?: string[]; observational?: string[] }
> = {
  'boat-inshore': {
    environmental: [
      'boat-intro',
      'inshore-wind',
      'inshore-tide-and-current',
      'inshore-wind-against-tide',
      'inshore-moon-phase',
      'inshore-weather-and-light',
      'inshore-barometric-pressure',
      'inshore-water-temperature',
      'inshore-water-clarity',
      'inshore-how-the-species-respond',
      'inshore-false-albacore',
      'inshore-safety',
      'inshore-from-conditions-to-confirmation',
    ],
    observational: [
      'inshore-intro-look-out-the-window',
      'birds-your-first-data-at-distance',
      'bait-what-it-is-and-what-it-s-doing',
      'activity-the-aggression-gauge',
      'structure-how-fish-are-using-it-right-now',
      'echoes-electronics-confirm-everything',
      'the-echo-pattern-library',
      'from-b-a-s-e-to-a-mode',
      'reading-the-three-predators-differently',
      'how-the-read-changes-the-plan',
      'the-10-minute-verdict-the-handoff-the-feedback-loop',
    ],
  },
  'boat-offshore': {
    // Mirrors the observational order below — see NOTE above.
    environmental: [
      'part-3-offshore-part-3-intro',
      'part-3-offshore-birds',
      'part-3-offshore-whales',
      'part-3-offshore-bait',
      'part-3-offshore-activity',
      'part-3-offshore-structure',
      'part-3-offshore-echoes-and-electronics',
      'part-3-offshore-the-vertical-game',
      'part-3-offshore-from-b-a-s-e-to-a-mode',
      'part-3-offshore-system-states-and-failure-patterns',
      'part-3-offshore-search-vs-commit',
      'part-3-offshore-the-10-minute-verdict-and-the-synthesis',
    ],
    observational: [
      'intro-offshore',
      'offshore-birds',
      'offshore-whales',
      'offshore-bait',
      'offshore-activity',
      'offshore-structure',
      'offshore-echoes-and-electronics',
      'offshore-the-vertical-game',
      'offshore-from-b-a-s-e-to-a-mode',
      'offshore-system-states-and-failure-patterns',
      'offshore-search-vs-commit',
      'offshore-the-10-minute-verdict-and-the-synthesis',
    ],
  },
  shore: {
    environmental: [
      'shore-intro',
      'shore-wind',
      'shore-tide-and-current',
      'shore-wind-and-tide-direction',
      'shore-moon-phase',
      'shore-weather-and-light',
      'shore-barometric-pressure',
      'shore-water-temperature-trends-and-sst',
      'shore-water-clarity',
      'shore-salinity-and-freshwater-influence',
      'shore-wave-direction-and-energy',
      'shore-microstructure-positioning',
      'shore-presentation-geometry',
      'shore-how-the-species-respond',
      'shore-false-albacore',
      'shore-safety',
    ],
    observational: [
      'shore-intro',
      'shore-birds',
      'shore-bait',
      'shore-activity',
      'shore-structure',
      'shore-echoes',
      'shore-system-states-and-failure-patterns',
      // Slug carries an upstream typo ("checklsit") — matched verbatim.
      'shore-the-10-minute-verdict-and-pre-cast-checklsit',
    ],
  },
}

/**
 * Sort `items` by their slug's position in `order`; unlisted items keep to the
 * end in name order. Returns a new array (never mutates the fetched data).
 */
function orderBySlug(items: SystemItem[], order?: string[]): SystemItem[] {
  if (!order?.length) return items
  const rank = new Map(order.map((slug, i) => [slug, i]))
  const at = (item: SystemItem) => {
    const r = item.slug ? rank.get(item.slug) : undefined
    return r ?? Number.MAX_SAFE_INTEGER
  }
  return [...items].sort(
    (a, b) => at(a) - at(b) || (a.name ?? '').localeCompare(b.name ?? ''),
  )
}

interface SystemData {
  approaches: SystemItem[]
  structures: SystemItem[]
  parentLures: SystemItem[]
  techniques: SystemItem[]
  observational: SystemItem[]
  environmental: SystemItem[]
}

export function generateStaticParams() {
  return SYSTEM_ZONES.map((z) => ({ zone: z.slug }))
}

export async function generateMetadata(props: {
  params: Promise<{ zone: string }>
}): Promise<Metadata> {
  const { zone } = await props.params
  const config = SYSTEM_ZONE_BY_SLUG[zone]
  if (!config) return {}
  return {
    title: config.title,
    description: config.tagline,
    alternates: { canonical: `/system/${zone}` },
    openGraph: {
      type: 'website',
      url: `/system/${zone}`,
      title: config.title,
      description: config.tagline,
    },
  }
}

/** Wraps a card in its detail-route link when the type has one; otherwise a
 *  plain <article>. When linked, the whole card is the click target. */
function CardShell({
  segment,
  slug,
  children,
}: {
  segment?: string
  slug: string | null
  children: React.ReactNode
}) {
  const cardClass =
    'flex flex-col overflow-hidden rounded-[5px] border border-body bg-box'
  return segment && slug ? (
    <Link
      href={`/${segment}/${slug}`}
      className={`${cardClass} transition-colors hover:border-green-light`}
    >
      {children}
    </Link>
  ) : (
    <article className={cardClass}>{children}</article>
  )
}

/** Card title — shared sizing across every card variant. */
function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="font-mono text-lg font-semibold leading-snug text-header">
      {children}
    </h4>
  )
}

/**
 * Image card (approach/structure/parentLure/technique): a `4:3` thumbnail above
 * the title. The image is `object-cover` so it fills the frame with no letterbox
 * gaps; types with no image (structure) get a neutral placeholder.
 */
function ImageCard({ item, segment }: { item: SystemItem; segment?: string }) {
  const name = item.name ?? 'Untitled'
  return (
    <CardShell segment={segment} slug={item.slug}>
      {item.imageUrl ? (
        <div className="aspect-[4/3] overflow-hidden rounded-t-[5px] bg-white">
          {/* Plain URL (ImageKit diagram or Shopify product shot), not a Sanity
              asset, so a bare <img> — same treatment as the taxonomy detail
              pages. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.imageUrl}
            alt={name}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] rounded-t-[5px] bg-body" />
      )}
      <div className="flex flex-1 items-center px-3 py-3">
        <CardTitle>{name}</CardTitle>
      </div>
    </CardShell>
  )
}

/**
 * Text card (observational/environmental): the title over a short excerpt
 * flattened from the doc's richText body, in place of an image.
 */
function TextCard({ item, segment }: { item: SystemItem; segment?: string }) {
  const name = item.name ?? 'Untitled'
  const raw = (item.excerpt ?? '').replace(/\s+/g, ' ').trim()
  const excerpt =
    raw.length > EXCERPT_LENGTH ? `${raw.slice(0, EXCERPT_LENGTH).trimEnd()}…` : raw
  return (
    <CardShell segment={segment} slug={item.slug}>
      <div className="flex flex-1 flex-col gap-2 px-4 py-4">
        <CardTitle>{name}</CardTitle>
        {excerpt && (
          <p className="text-[15px] leading-relaxed text-ink">{excerpt}</p>
        )}
      </div>
    </CardShell>
  )
}

/**
 * A labeled group of cards within a section. `variant` picks the card shape and
 * grid density: image cards run 4-wide; text cards (observational/environmental)
 * run 2-wide so the excerpt has room to breathe.
 */
function Group({
  label,
  items,
  segment,
  variant = 'image',
}: {
  label: string
  items: SystemItem[]
  segment?: string
  variant?: 'image' | 'text'
}) {
  const gridClass =
    variant === 'text'
      ? 'grid grid-cols-1 gap-4 sm:grid-cols-2'
      : 'grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'
  return (
    <div className="space-y-4">
      <h3 className="font-mono text-sm font-semibold uppercase tracking-wider text-green-dark">
        {label} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-header">— none tagged for this zone —</p>
      ) : (
        <div className={gridClass}>
          {items.map((item) =>
            variant === 'text' ? (
              <TextCard key={item._id} item={item} segment={segment} />
            ) : (
              <ImageCard key={item._id} item={item} segment={segment} />
            ),
          )}
        </div>
      )}
    </div>
  )
}

/** One of the four numbered content sections. */
function Section({
  n,
  title,
  subtitle,
  children,
}: {
  n: number
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <section className="scroll-mt-24 space-y-6">
      <div className="space-y-2">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-green-dark">
          Part {n}
        </p>
        <h2 className="font-mono text-2xl font-bold leading-tight text-header sm:text-3xl">
          {title}
        </h2>
        <p className="font-mono text-sm font-semibold uppercase tracking-wider text-ink">
          {subtitle}
        </p>
      </div>
      {children}
    </section>
  )
}

export default async function SystemZonePage(props: {
  params: Promise<{ zone: string }>
}) {
  const { zone } = await props.params
  const config = SYSTEM_ZONE_BY_SLUG[zone]
  if (!config) notFound()

  const data = (await sanityFetch({
    query: systemByZoneQuery,
    params: { zoneIds: bothIdForms(config.zoneId) },
  })) as SystemData

  // Apply the editor-curated running order to the two text sections.
  const order = FACTOR_ORDER[zone] ?? {}
  const environmental = orderBySlug(data.environmental, order.environmental)
  const observational = orderBySlug(data.observational, order.observational)

  return (
    <main className="bg-body">
      <div className="mx-auto w-full max-w-6xl px-5 pt-14 pb-20 sm:pt-20 sm:pb-28">
        {/* Hero */}
        <header className="space-y-4">
          <nav
            aria-label="Breadcrumb"
            className="font-mono text-xs uppercase tracking-wider text-header"
          >
            <Link href="/" className="hover:text-green-dark">
              Home
            </Link>{' '}
            {'›'}{' '}
            <Link href="/system" className="hover:text-green-dark">
              Capt. Mike&rsquo;s System
            </Link>{' '}
            {'›'} {config.title}
          </nav>
          <h1 className="font-mono text-4xl font-bold leading-[1.1] text-header sm:text-5xl">
            {config.title}
          </h1>
          <p className="max-w-2xl text-[18px] leading-relaxed text-ink sm:text-xl">
            {config.tagline}
          </p>
        </header>

        <div className="mt-14 space-y-16 sm:mt-16 sm:space-y-20">
          <Section
            n={1}
            title="Environmental Factors"
            subtitle="What the Water Is Telling You"
          >
            <Group
              label="Environmental Factors"
              items={environmental}
              segment="environmental"
              variant="text"
            />
          </Section>

          <Section
            n={2}
            title="Observational Factors"
            subtitle="The Moment of Truth"
          >
            <Group
              label="Observational Factors"
              items={observational}
              segment="observational"
              variant="text"
            />
          </Section>

          <Section
            n={3}
            title="Structure & Approach"
            subtitle="Position Defines Presentation"
          >
            <Group
              label="Approaches"
              items={data.approaches}
              segment="approaches"
            />
            <Group
              label="Structures"
              items={data.structures}
              segment="structures"
            />
          </Section>

          <Section
            n={4}
            title="Gear & Technique"
            subtitle="Match the Hatch, the Depth, and the Mood"
          >
            <Group
              label="Parent Lures"
              items={data.parentLures}
              segment="parent-lures"
            />
            <Group
              label="Techniques"
              items={data.techniques}
              segment="techniques"
            />
          </Section>
        </div>
      </div>

      <JsonLd
        data={breadcrumbList([
          { name: 'Home', path: '/' },
          { name: "Capt. Mike's System", path: '/system' },
          { name: config.title },
        ])}
      />
    </main>
  )
}
