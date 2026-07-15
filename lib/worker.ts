/**
 * Client for the Salty Cape Cloudflare Worker (tide/current/conditions data).
 * All calls happen client-side after hydration so spot pages stay static.
 *
 * ⚠ CORS: the Worker whitelists a single origin (salty-cape.webflow.io). Until
 * our origins (localhost, *.app.github.dev, production) are added there — a
 * separate Worker-repo task — browser fetches fail and the UI shows its error
 * state. Endpoint shapes below were captured via curl (not browser).
 */
export const WORKER_URL = (
  process.env.NEXT_PUBLIC_WORKER_URL ||
  'https://salty-cape-api.hogylureco.workers.dev'
).replace(/\/$/, '')

/** GET /tides?station=<noaaId>&days=N → array of high/low events. */
export interface TideEvent {
  /** "YYYY-MM-DD HH:mm" in the station's local (Eastern) time. */
  t: string
  /** Height in feet (string). */
  v: string
  /** High or Low. */
  type: 'H' | 'L'
}

/** GET /currents?station=<id>&days=N → array of slack/ebb/flood events. */
export interface CurrentEvent {
  Type: string
  /** "YYYY-MM-DD HH:mm" in the station's local (Eastern) time. */
  Time: string
  /** Knots; negative = ebb, positive = flood. */
  Velocity_Major: number
  meanFloodDir?: number
  meanEbbDir?: number
  Depth?: string
  Bin?: string
}

/**
 * Tide `station` is the NOAA numeric id, but the spot field embeds it in a
 * label — e.g. "Boston HW/LW (8443970)" or a bare "8447270". Extract the digits.
 */
export function parseNoaaStationId(raw: string | null | undefined): string | null {
  if (!raw) return null
  const match = raw.match(/(\d{5,})/)
  return match ? match[1] : null
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Worker timestamps ("YYYY-MM-DD HH:mm") are already in the station's local
 * (Eastern) wall-clock time. Format the parts directly — do NOT parse to a Date,
 * which would reinterpret them in the browser's timezone or UTC.
 */
export function formatEastern(ts: string): string {
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
  if (!m) return ts
  const [, , mo, day, hh, mm] = m
  let hour = parseInt(hh, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  const month = MONTHS[parseInt(mo, 10) - 1] ?? mo
  return `${month} ${parseInt(day, 10)}, ${hour}:${mm} ${ampm} ET`
}

/** Fetch + parse JSON, throwing on non-2xx so callers hit their error state. */
export async function fetchWorkerJson<T>(
  path: string,
  signal: AbortSignal,
): Promise<T> {
  const res = await fetch(`${WORKER_URL}${path}`, { signal })
  if (!res.ok) throw new Error(`Worker ${path} → HTTP ${res.status}`)
  return (await res.json()) as T
}
