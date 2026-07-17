'use client'

import { useEffect, useState } from 'react'

import { type CurrentEvent, fetchWorkerJson } from '@/lib/worker'

export interface PeakTidesTodayProps {
  spotId: string
  currentStationId: string | null
}

interface Data {
  currents: CurrentEvent[]
}

const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { at: number; data: Data }>()

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: Data }

/** Half-width of a peak fishing window: 45 minutes on either side of the peak. */
const WINDOW_MS = 45 * 60 * 1000

/** Today's date in America/New_York as "Thu, Jul 17" for the module header. */
function todayEasternLabel(): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).formatToParts(new Date())
  const p: Record<string, string> = {}
  for (const part of parts) p[part.type] = part.value
  return `${p.weekday}, ${p.month} ${p.day}`
}

/**
 * Worker current timestamps are "YYYY-MM-DD HH:mm" in the station's local
 * (Eastern) wall-clock time. Parse them into a UTC-based epoch so we can do pure
 * ±minute arithmetic for the window edges — treating the wall-clock as if it were
 * UTC keeps the browser's own timezone out of the math. Reformat with getUTC*.
 */
function easternToUtcMs(ts: string): number | null {
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})/)
  if (!m) return null
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
}

/** UTC-based epoch → "3:24 PM". */
function clock(ms: number): string {
  const d = new Date(ms)
  let hour = d.getUTCHours()
  const min = String(d.getUTCMinutes()).padStart(2, '0')
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${min} ${ampm}`
}

/** "YYYY-MM-DD HH:mm" for now in America/New_York (string-comparable). */
function nowEastern(): string {
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

interface PeakWindow {
  key: string
  tone: 'ebb' | 'flood'
  label: string
  range: string
  knots: string
}

/**
 * Peak fishing windows = the max-current events NOAA returns (Type ebb/flood,
 * i.e. peak ebb and peak flood — the slack turns are excluded), each expanded to
 * the 45-minutes-either-side window. Only windows that haven't fully passed
 * (end ≥ now) are shown, next few first.
 */
function peakWindows(currents: CurrentEvent[], count = 5): PeakWindow[] {
  const nowMs = easternToUtcMs(nowEastern()) ?? 0
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
    })
    if (out.length >= count) break
  }
  return out
}

const PILL: Record<'ebb' | 'flood', string> = {
  ebb: 'bg-red-dark/10 text-red-dark ring-1 ring-red-dark/30',
  flood: 'bg-green-dark/10 text-green-dark ring-1 ring-green-dark/30',
}

export function PeakTidesToday({
  spotId,
  currentStationId,
}: PeakTidesTodayProps) {
  const [state, setState] = useState<State>({ status: 'loading' })

  // Peak fishing windows come entirely from current predictions, so a spot with
  // no current station id can't be served (the Worker requires an explicit id
  // and has no nearest-by-coords lookup). Render a quiet designed "unavailable"
  // state for these instead of the network error state.
  const currentId = currentStationId?.trim() || null
  const servable = Boolean(currentId)

  useEffect(() => {
    if (!servable || !currentId) return
    const cached = cache.get(spotId)
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setState({ status: 'success', data: cached.data })
      return
    }
    const controller = new AbortController()

    async function load() {
      const currents = await fetchWorkerJson<CurrentEvent[]>(
        `/currents?station=${encodeURIComponent(currentId!)}&days=2`,
        controller.signal,
      )
      if (controller.signal.aborted) return
      if (!Array.isArray(currents)) {
        setState({ status: 'error' })
        return
      }
      const data: Data = { currents }
      cache.set(spotId, { at: Date.now(), data })
      setState({ status: 'success', data })
    }
    load().catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })
    return () => controller.abort()
  }, [spotId, currentId, servable])

  const eyebrow =
    'font-mono text-xs font-semibold uppercase tracking-wider text-header'

  return (
    <section aria-busy={servable && state.status === 'loading'} className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className={eyebrow}>Peak Fishing Times Today</h2>
        {servable && (
          <span className="font-mono text-xs text-header/60">{todayEasternLabel()}</span>
        )}
      </div>
      <hr className="my-3 border-body" />

      {/* Designed "unavailable" state — a spot with no current station id can't be
          served (not an error). Distinct from the Worker-failure state below. */}
      {!servable && (
        <p className="text-sm text-header/70">
          Peak fishing times unavailable for this location.
        </p>
      )}

      {servable && state.status === 'loading' && (
        <div className="space-y-1.5" aria-hidden>
          <div className="h-6 animate-pulse rounded-[5px] bg-body" />
          <div className="h-6 animate-pulse rounded-[5px] bg-body" />
          <div className="h-6 animate-pulse rounded-[5px] bg-body" />
        </div>
      )}

      {servable && state.status === 'error' && (
        <p className="text-sm text-header">Conditions unavailable.</p>
      )}

      {state.status === 'success' &&
        (() => {
          const windows = peakWindows(state.data.currents)
          if (windows.length === 0) {
            return (
              <p className="text-sm text-header">
                No peak windows in the current forecast.
              </p>
            )
          }
          return (
            <ul className="space-y-1.5">
              {windows.map((w) => (
                <li
                  key={w.key}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span
                    className={`inline-block min-w-[3.5rem] rounded-[5px] px-2 py-0.5 text-center font-mono text-[0.7rem] font-bold ${PILL[w.tone]}`}
                  >
                    {w.label}
                  </span>
                  <span className="flex-1 truncate font-mono text-xs text-header">
                    {w.range}
                  </span>
                  <span className="font-mono text-xs font-semibold text-ink">
                    {w.knots}
                  </span>
                </li>
              ))}
            </ul>
          )
        })()}

      {/* Why these windows: peak current is when fishing is best. */}
      {servable && (
        <p className="mt-3 text-xs leading-relaxed text-header/70">
          Best bite is the ~90 minutes around maximum current — 45 minutes either
          side of peak ebb and peak flood — when the moving water sweeps bait off
          structure and gamefish feed hardest. The slack tide in between is the
          slow window.
        </p>
      )}

      {servable && (
        <div className="mt-auto pt-4">
          {/* Activates the "Fishing Times" tab (7-day tides & currents). SpotTabs
              listens for hashchange and selects the matching panel; there is no
              element with this literal id, so the browser only updates the hash
              rather than scroll-jumping. */}
          <a
            href="#fishing-times"
            className="font-mono text-xs font-semibold text-green-dark hover:underline"
          >
            View 7-day forecast →
          </a>
        </div>
      )}
    </section>
  )
}
