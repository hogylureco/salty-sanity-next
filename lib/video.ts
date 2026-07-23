/**
 * Video helpers. The `video` schema has NO thumbnail asset, so thumbnails are
 * derived from the YouTube id. Videos DO have slugs and their own in-app route
 * (/videos/[slug]); `videoHref` remains the outbound YouTube link used by the
 * embed and the "Watch on YouTube" affordance. Kept pure/presentational.
 */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "2025-05-26" → "May 26, 2025". Null for missing/malformed dates. */
export function formatVideoDate(date: string | null | undefined): string | null {
  if (!date) return null
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return null
  const [, y, mo, d] = m
  const month = MONTHS[parseInt(mo, 10) - 1]
  if (!month) return null
  return `${month} ${parseInt(d, 10)}, ${y}`
}

/** YouTube thumbnail from the video id. `hqdefault` always exists (unlike maxres). */
export function youtubeThumb(videoID: string | null | undefined): string | null {
  return videoID ? `https://img.youtube.com/vi/${videoID}/hqdefault.jpg` : null
}

/** Outbound link: prefer the stored watch URL, else build one from the id. */
export function videoHref(
  watchURL: string | null | undefined,
  videoID: string | null | undefined,
): string | null {
  if (watchURL) return watchURL
  if (videoID) return `https://www.youtube.com/watch?v=${videoID}`
  return null
}

/**
 * Display label for the free-form `videoCategory` string. The data holds a few
 * inconsistent raw values (`saltycapetv`, `howtovideo`, `hogylurecompany` and
 * `hogy-lure-company`); map the known ones, and title-case anything unknown so a
 * new value never renders as a raw slug. Null/empty → null (caller drops it).
 */
export function formatVideoCategory(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null
  const key = raw.toLowerCase().replace(/[-_\s]/g, '')
  const known: Record<string, string> = {
    saltycapetv: 'Salty Cape TV',
    howtovideo: 'How-To',
    hogylurecompany: 'Hogy Lure Company',
  }
  if (known[key]) return known[key]
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}
