import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JsonLd } from '@/components/JsonLd'
import { SpotPortableText } from '@/components/portable-text/SpotPortableText'
import { GearRail, type GearItem } from '@/components/spot/rail/GearRail'
import { SpotToc } from '@/components/spot/SpotToc'
import { sanityFetch } from '@/lib/sanity/client'
import {
  allVideoSlugsQuery,
  videoBySlugQuery,
  videoMetaBySlugQuery,
} from '@/lib/sanity/queries'
import { hasPortableText, headingsOf, type TocEntry } from '@/lib/spot-sections'
import { formatVideoCategory, formatVideoDate, videoHref, youtubeThumb } from '@/lib/video'
import type {
  AllVideoSlugsQueryResult,
  VideoBySlugQueryResult,
  VideoMetaBySlugQueryResult,
} from '@/sanity.types'

export const revalidate = 3600
export const dynamicParams = true

export async function generateStaticParams() {
  const slugs = (await sanityFetch({
    query: allVideoSlugsQuery,
    tags: ['video'],
  })) as AllVideoSlugsQueryResult
  return slugs
    .filter((s): s is { slug: string } => Boolean(s.slug))
    .map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const meta = (await sanityFetch({
    query: videoMetaBySlugQuery,
    params: { slug },
    tags: ['video', `video:${slug}`],
  })) as VideoMetaBySlugQueryResult
  if (!meta) return {}
  const description = meta.excerpt
    ? meta.excerpt.replace(/\s+/g, ' ').trim().slice(0, 155)
    : undefined
  return { title: meta.title ?? 'Video', description }
}

export default async function VideoPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const video = (await sanityFetch({
    query: videoBySlugQuery,
    params: { slug },
    tags: ['video', `video:${slug}`],
  })) as VideoBySlugQueryResult

  if (!video) notFound()

  const title = video.title ?? 'Untitled video'
  const date = formatVideoDate(video.videoFilmDate)
  const category = formatVideoCategory(video.videoCategory)
  const watch = videoHref(video.watchURL, video.videoID)
  // Weak refs; keep only the ones that resolved (null-guard).
  const spots = (video.spots ?? []).filter(
    (s): s is NonNullable<typeof s> => s != null,
  )
  const gear = (video.lureCatalog ?? []).filter(
    (g): g is NonNullable<typeof g> => g != null,
  )

  const meta = [date, category, video.hosts].filter(Boolean) as string[]

  // H2-only sidebar TOC for the description. The ids come from the SAME
  // `slugifyHeading` the Portable Text renderer stamps onto each H2, so the
  // links land on the right heading. Empty subs → a flat list of H2s only.
  const h2Entries: TocEntry[] = headingsOf(video.description, ['h2'], 20).map(
    (h) => ({ id: h.id, title: h.title, hasContent: true, subs: [] }),
  )

  // Text content below the video (description + featured spots), shared between
  // the with-sidebar and no-sidebar layouts.
  const belowVideo = (
    <>
      {hasPortableText(video.description) && (
        <div className="box">
          <SpotPortableText value={video.description} />
        </div>
      )}

      {/* Featured spots — links to the spot pages (resolved weak refs only). */}
      {spots.length > 0 && (
        <div className="box">
          <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
            Featured Spots
          </h2>
          <hr className="my-3 border-body" />
          <ul className="flex flex-wrap gap-2">
            {spots.map((s) => {
              const label = s.name ?? s.id ?? s._id
              const chip =
                'inline-block rounded-[5px] bg-body px-2 py-1 font-mono text-xs'
              return (
                <li key={s._id}>
                  {s.slug ? (
                    <Link
                      href={`/spots/${s.slug}`}
                      className={`${chip} ring-1 ring-transparent hover:ring-green-light`}
                    >
                      {label}
                    </Link>
                  ) : (
                    <span className={chip}>{label}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description:
      (video.descriptionText || '').replace(/\s+/g, ' ').trim().slice(0, 300) ||
      title,
    ...(youtubeThumb(video.videoID)
      ? { thumbnailUrl: youtubeThumb(video.videoID) }
      : {}),
    ...(video.videoFilmDate ? { uploadDate: video.videoFilmDate } : {}),
    ...(video.videoID
      ? { embedUrl: `https://www.youtube.com/embed/${video.videoID}` }
      : {}),
    ...(watch ? { contentUrl: watch } : {}),
  }

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6">
      {/* Breadcrumb: Videos / Region */}
      <p className="font-mono text-xs uppercase tracking-wider text-header">
        <Link href="/videos" className="hover:text-green-dark">
          Videos
        </Link>
        {video.region?.slug && video.region.name && (
          <>
            {' / '}
            <Link
              href={`/regions/${video.region.slug}`}
              className="hover:text-green-dark"
            >
              {video.region.name}
            </Link>
          </>
        )}
      </p>

      <header className="space-y-2">
        <h1 className="font-mono text-2xl font-bold leading-tight text-header sm:text-3xl">
          {title}
        </h1>
        {meta.length > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-sm text-header">
            {meta.map((m, i) => (
              <span key={m} className="flex items-center gap-x-2">
                {i > 0 && <span aria-hidden>·</span>}
                {m}
              </span>
            ))}
          </p>
        )}
      </header>

      {/* YouTube embed (responsive 16:9). Falls back to the "Watch on YouTube"
          link below when there's no video id.

          `referrerPolicy` is REQUIRED, not cosmetic: YouTube's embed returns a
          "Video player configuration error" for any request that reaches it with
          no `Referer`. A browser normally sends one, but a stricter inherited
          document policy (privacy browsers/extensions, or a preview/proxy that
          injects `Referrer-Policy: no-referrer`) can strip it — which breaks
          EVERY embed. Setting the policy on the element itself overrides any such
          inherited policy so the origin is always sent as the referrer. */}
      {video.videoID ? (
        <div className="box overflow-hidden p-0">
          <div className="relative aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${video.videoID}?rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        </div>
      ) : null}

      {watch && (
        <p>
          <a
            href={watch}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-sm font-semibold text-green-dark hover:underline"
          >
            Watch on YouTube ↗
          </a>
        </p>
      )}

      {/* Gear slider — the lures featured in this video (manual-deref'd). */}
      {gear.length > 0 && (
        <div className="box">
          <GearRail
            items={video.lureCatalog as Array<GearItem | null> | null}
            variant="slider"
            title="Gear In This Video"
          />
        </div>
      )}

      {/* Text content below the (full-width) video. When the description has H2s,
          they drive a sticky sidebar TOC (H2s only); otherwise the content spans
          the column normally. The sidebar is lg-only (SpotToc hides below lg). */}
      {h2Entries.length > 0 ? (
        <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <SpotToc entries={h2Entries} />
          <div className="min-w-0 space-y-6">{belowVideo}</div>
        </div>
      ) : (
        <div className="space-y-6">{belowVideo}</div>
      )}

      <JsonLd data={jsonLd} />
    </main>
  )
}
