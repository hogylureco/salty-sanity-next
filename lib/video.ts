/**
 * Video helpers. The `video` schema has NO thumbnail asset and NO route (Phase 4
 * excluded it), so thumbnails are derived from the YouTube id and cards link out
 * to YouTube. Kept pure/presentational so VideoCard stays data-source-agnostic.
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
