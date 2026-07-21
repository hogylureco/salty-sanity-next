/**
 * Peak fishing windows, shared by the dashboard "Peak Fishing Times Today" box
 * and the Fishing Times tab's 7-day view so both render identically.
 *
 * A peak window = the ~90 minutes around a NOAA max-current event (peak ebb or
 * peak flood; slack turns excluded) — 45 minutes either side of the peak, when
 * moving water sweeps bait off structure and gamefish feed hardest.
 */
import type { CurrentEvent } from './worker'

/** Half-width of a peak fishing window: 45 minutes on either side of the peak. */
export const WINDOW_MS = 45 * 60 * 1000

/**
 * Worker current timestamps ("YYYY-MM-DD HH:mm") are already the station's local
 * (Eastern) wall-clock time. Parse to a UTC-based epoch so ±minute arithmetic on
 * the window edges keeps the browser's own timezone out of the math; reformat
 * with getUTC* via `clock`.
 */
export function easternToUtcMs(ts: string): number | null {
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
  if (!m) return null
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
}

/** UTC-based epoch → "3:24 PM". */
export function clock(ms: number): string {
  const d = new Date(ms)
  let hour = d.getUTCHours()
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${min} ${ampm}`
}

/** "YYYY-MM-DD HH:mm" for now in America/New_York (string-comparable). */
export function nowEastern(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const p: Record<string, string> = {}
  for (const part of parts) p[part.type] = part.value
  const hour = p.hour === '24' ? '00' : p.hour
  return `${p.year}-${p.month}-${p.day} ${hour}:${p.minute}`
}

export interface PeakWindow {
  key: string
  tone: 'ebb' | 'flood'
  label: string
  range: string
  knots: string
  /** "YYYY-MM-DD" of the peak, for grouping the 7-day view by day. */
  day: string
  peakMs: number
}

/**
 * Peak ebb/flood windows from NOAA current events. `sinceNow` drops windows that
 * have fully passed (used by the Today box); `count` caps the result.
 */
export function toPeakWindows(
  currents: CurrentEvent[],
  opts: { sinceNow?: boolean; count?: number } = {},
): PeakWindow[] {
  const nowMs = opts.sinceNow ? (easternToUtcMs(nowEastern()) ?? 0) : -Infinity
  const out: PeakWindow[] = []
  for (const c of currents) {
    if (c.Type === 'slack') continue
    const peak = easternToUtcMs(c.Time)
    if (peak == null) continue
    if (peak + WINDOW_MS < nowMs) continue // window fully in the past
    out.push({
      key: `${c.Time}-${c.Type}`,
      tone: c.Type === 'ebb' ? 'ebb' : 'flood',
      label: c.Type.toUpperCase(),
      range: `${clock(peak - WINDOW_MS)} – ${clock(peak + WINDOW_MS)} ET`,
      knots: `${Math.abs(c.Velocity_Major).toFixed(1)} kt`,
      day: c.Time.slice(0, 10),
      peakMs: peak,
    })
    if (opts.count && out.length >= opts.count) break
  }
  return out
}

/** Group peak windows by their day, preserving chronological order. */
export function groupWindowsByDay(
  windows: PeakWindow[],
): Array<{ day: string; windows: PeakWindow[] }> {
  const byDay = new Map<string, PeakWindow[]>()
  for (const w of windows) {
    const list = byDay.get(w.day) ?? []
    list.push(w)
    byDay.set(w.day, list)
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => ({ day, windows: list }))
}

export const PILL: Record<'ebb' | 'flood', string> = {
  ebb: 'bg-red-dark/10 text-red-dark ring-1 ring-red-dark/30',
  flood: 'bg-green-dark/10 text-green-dark ring-1 ring-green-dark/30',
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** "2026-07-22" → "Wed, Jul 22". UTC construction avoids TZ drift on the label. */
export function dayLabel(date: string): string {
  const [y, mo, da] = date.split('-').map(Number)
  const wd = new Date(Date.UTC(y, mo - 1, da)).getUTCDay()
  return `${WEEKDAYS[wd]}, ${MONTHS[mo - 1]} ${da}`
}
