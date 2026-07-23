import Link from 'next/link'

/**
 * Pure presentational video card. No data fetching — the page derives thumbnail
 * / href / formatted date and passes them in. The whole card links to the video's
 * in-app page (/videos/[slug]) by default; pass `external` for the YouTube
 * fallback used only when a video has no slug. The region link sits above the
 * card link so it navigates to the region instead. Sparse data (e.g. no date)
 * drops the piece AND its separator cleanly — never "undefined" or a dangling "·".
 */
export interface VideoCardProps {
  title: string
  date?: string | null
  regionName?: string | null
  regionSlug?: string | null
  thumbnailUrl: string | null
  href: string
  /** External (YouTube) link → new tab; internal (video page) → soft nav. */
  external?: boolean
}

function CameraIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

export function VideoCard({
  title,
  date,
  regionName,
  regionSlug,
  thumbnailUrl,
  href,
  external = false,
}: VideoCardProps) {
  const hasDate = Boolean(date)
  const hasRegion = Boolean(regionName)

  return (
    <article className="group relative box overflow-hidden p-0">
      {/* 16:9 thumbnail, image bleeds to Box edge, scales subtly on hover. */}
      <div className="relative aspect-video overflow-hidden bg-body">
        {thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full bg-header/10" />
        )}
        {/* Play overlay — semi-transparent circle + triangle, brightens on hover. */}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden>
            <circle
              cx="28"
              cy="28"
              r="27"
              className="fill-black/50 transition-colors duration-200 group-hover:fill-black/70"
            />
            <path d="M23 18 L40 28 L23 38 Z" fill="#fff" />
          </svg>
        </span>
      </div>

      <div className="p-3">
        {/* Meta row: camera + date · pin + region. Missing pieces drop cleanly. */}
        {(hasDate || hasRegion) && (
          <div className="mb-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-xs text-header">
            {hasDate && (
              <span className="inline-flex items-center gap-1">
                <CameraIcon />
                {date}
              </span>
            )}
            {hasDate && hasRegion && <span aria-hidden>·</span>}
            {hasRegion && (
              <span className="inline-flex items-center gap-1">
                <PinIcon />
                {regionSlug ? (
                  // z-20 sits above the stretched card link (z-10), so a click
                  // here navigates to the region — the two anchors are siblings,
                  // so no JS stopPropagation is needed (keeps this a server comp).
                  <Link
                    href={`/regions/${regionSlug}`}
                    className="relative z-20 text-red-dark hover:underline"
                  >
                    {regionName}
                  </Link>
                ) : (
                  <span>{regionName}</span>
                )}
              </span>
            )}
          </div>
        )}

        {/* Title: Inconsolata 700, #333, 2-line clamp with ellipsis. */}
        <h3 className="line-clamp-2 font-mono text-base font-bold leading-snug text-ink">
          {title}
        </h3>
      </div>

      {/* Stretched card link. z-10 under the region link's z-20. Internal → a soft
          nav to the video page; external → YouTube in a new tab (slugless fallback). */}
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={title}
          className="absolute inset-0 z-10"
        >
          <span className="sr-only">{title}</span>
        </a>
      ) : (
        <Link href={href} aria-label={title} className="absolute inset-0 z-10">
          <span className="sr-only">{title}</span>
        </Link>
      )}
    </article>
  )
}
