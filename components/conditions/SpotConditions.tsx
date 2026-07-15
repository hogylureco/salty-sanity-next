'use client'

import { useEffect, useState } from 'react'

import {
  type CurrentEvent,
  type TideEvent,
  fetchWorkerJson,
  formatEastern,
  parseNoaaStationId,
} from '@/lib/worker'

export interface SpotConditionsProps {
  spotId: string
  tideStationId: string | null
  currentStationId: string | null
}

interface ConditionsData {
  tides: TideEvent[] | null
  currents: CurrentEvent[] | null
}

// Module-level 5-minute cache keyed by spot id, so back/forward navigation
// reuses data instead of re-hitting the Worker.
const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { at: number; data: ConditionsData }>()

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: ConditionsData }

/** "YYYY-MM-DD HH:mm" for now in America/New_York, for chronological string compare. */
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

/** Next `count` events at/after now (Eastern); falls back to the last few. */
function upcoming<T>(events: T[], time: (e: T) => string, count = 4): T[] {
  const now = nowEastern()
  const future = events.filter((e) => time(e) >= now)
  return (future.length > 0 ? future : events.slice(-count)).slice(0, count)
}

export function SpotConditions({
  spotId,
  tideStationId,
  currentStationId,
}: SpotConditionsProps) {
  // Always start 'loading' for a deterministic SSR/first-client render (no
  // hydration mismatch); the effect fills from cache or network after mount.
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const cached = cache.get(spotId)
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setState({ status: 'success', data: cached.data })
      return
    }

    const controller = new AbortController()
    const tideId = parseNoaaStationId(tideStationId)
    const currentId = currentStationId?.trim() || null

    async function load() {
      const [tidesResult, currentsResult] = await Promise.allSettled([
        tideId
          ? fetchWorkerJson<TideEvent[]>(
              `/tides?station=${encodeURIComponent(tideId)}&days=2`,
              controller.signal,
            )
          : Promise.reject(new Error('no tide station')),
        currentId
          ? fetchWorkerJson<CurrentEvent[]>(
              `/currents?station=${encodeURIComponent(currentId)}&days=2`,
              controller.signal,
            )
          : Promise.reject(new Error('no current station')),
      ])
      if (controller.signal.aborted) return

      const tides =
        tidesResult.status === 'fulfilled' && Array.isArray(tidesResult.value)
          ? tidesResult.value
          : null
      const currents =
        currentsResult.status === 'fulfilled' &&
        Array.isArray(currentsResult.value)
          ? currentsResult.value
          : null

      if (tides === null && currents === null) {
        setState({ status: 'error' })
        return
      }
      const data: ConditionsData = { tides, currents }
      cache.set(spotId, { at: Date.now(), data })
      setState({ status: 'success', data })
    }

    // Belt-and-suspenders: a Worker outage / CORS block must never throw out of
    // this component into an error boundary.
    load().catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })

    return () => controller.abort()
  }, [spotId, tideStationId, currentStationId])

  const eyebrow =
    'mb-3 font-mono text-xs font-semibold uppercase tracking-wider text-header'

  if (state.status === 'loading') {
    return (
      <section aria-busy="true">
        <h2 className={eyebrow}>Conditions</h2>
        <p className="text-sm text-header">Loading tide &amp; current data…</p>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section>
        <h2 className={eyebrow}>Conditions</h2>
        <p className="text-sm text-header">Conditions unavailable.</p>
      </section>
    )
  }

  const { tides, currents } = state.data
  const nextTides = tides ? upcoming(tides, (t) => t.t) : []
  const nextCurrents = currents ? upcoming(currents, (c) => c.Time) : []

  const th = 'bg-header px-2 py-1.5 text-left font-mono text-xs font-semibold text-white'
  const td = 'border-t border-body px-2 py-1.5'
  const timeCell = `${td} whitespace-nowrap font-mono font-semibold text-green-dark`
  const subhead = 'mt-4 mb-2 font-sans text-base font-semibold text-header'

  return (
    <section>
      <h2 className={eyebrow}>Conditions</h2>

      <h3 className={subhead}>Next tides</h3>
      {nextTides.length === 0 ? (
        <p className="text-sm text-header">Tide data unavailable.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={th}>Time</th>
              <th scope="col" className={th}>Tide</th>
              <th scope="col" className={th}>Height (ft)</th>
            </tr>
          </thead>
          <tbody>
            {nextTides.map((tide) => (
              <tr key={`${tide.t}-${tide.type}`} className="odd:bg-box even:bg-body">
                <td className={timeCell}>{formatEastern(tide.t)}</td>
                <td className={`${td} font-sans`}>
                  {tide.type === 'H' ? 'High' : 'Low'}
                </td>
                <td className={`${td} font-mono`}>{tide.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 className={subhead}>Next current</h3>
      {nextCurrents.length === 0 ? (
        <p className="text-sm text-header">Current data unavailable.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className={th}>Time</th>
              <th scope="col" className={th}>Stage</th>
              <th scope="col" className={th}>Velocity (kts)</th>
            </tr>
          </thead>
          <tbody>
            {nextCurrents.map((current) => (
              <tr key={`${current.Time}-${current.Type}`} className="odd:bg-box even:bg-body">
                <td className={timeCell}>{formatEastern(current.Time)}</td>
                <td className={`${td} font-sans`}>{current.Type}</td>
                <td className={`${td} font-mono`}>{current.Velocity_Major}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
