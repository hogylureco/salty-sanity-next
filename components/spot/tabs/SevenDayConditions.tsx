'use client'

import { useEffect, useState } from 'react'

import {
  type CurrentEvent,
  type TideEvent,
  fetchWorkerJson,
  parseNoaaStationId,
} from '@/lib/worker'

/**
 * 7-day tide + current expansion for the Fishing Times tab. The Worker's
 * `/tides` and `/currents` endpoints both accept `days=7` (confirmed via recon:
 * ~31 tide events / ~62 current events across 7 days), so this is real data —
 * not a single-day stopgap. Fetched client-side after hydration so the spot page
 * stays static. Same Worker CORS caveat as the dashboard: until our origins are
 * whitelisted, browser fetches fail and this shows its error state.
 */
export interface SevenDayConditionsProps {
  spotId: string
  tideStationId: string | null
  currentStationId: string | null
}

interface Data {
  tides: TideEvent[] | null
  currents: CurrentEvent[] | null
}

const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { at: number; data: Data }>()

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: Data }

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** "2026-07-16" → "Wed, Jul 16". UTC construction avoids TZ drift on the label. */
function dayLabel(date: string): string {
  const [y, mo, da] = date.split('-').map(Number)
  const wd = new Date(Date.UTC(y, mo - 1, da)).getUTCDay()
  return `${WEEKDAYS[wd]}, ${MONTHS[mo - 1]} ${da}`
}

/** "2026-07-16 15:24" → "3:24 PM". The parts are already Eastern wall-clock. */
function timeOnly(ts: string): string {
  const m = ts.match(/(\d{2}):(\d{2})$/)
  if (!m) return ts
  let hour = parseInt(m[1], 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${m[2]} ${ampm}`
}

function groupByDay<T>(events: T[], time: (e: T) => string): Map<string, T[]> {
  const byDay = new Map<string, T[]>()
  for (const e of events) {
    const day = time(e).slice(0, 10)
    const list = byDay.get(day) ?? []
    list.push(e)
    byDay.set(day, list)
  }
  return byDay
}

function stageLabel(velocity: number): { label: string; tone: string } {
  if (Math.abs(velocity) < 0.1) return { label: 'Slack', tone: 'text-header' }
  return velocity < 0
    ? { label: 'Ebb', tone: 'text-red-dark' }
    : { label: 'Flood', tone: 'text-green-dark' }
}

export function SevenDayConditions({
  spotId,
  tideStationId,
  currentStationId,
}: SevenDayConditionsProps) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const key = `7d:${spotId}`
    const cached = cache.get(key)
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setState({ status: 'success', data: cached.data })
      return
    }
    const controller = new AbortController()
    const tideId = parseNoaaStationId(tideStationId)
    const currentId = currentStationId?.trim() || null

    async function load() {
      const [tRes, cRes] = await Promise.allSettled([
        tideId
          ? fetchWorkerJson<TideEvent[]>(
              `/tides?station=${encodeURIComponent(tideId)}&days=7`,
              controller.signal,
            )
          : Promise.reject(new Error('no tide station')),
        currentId
          ? fetchWorkerJson<CurrentEvent[]>(
              `/currents?station=${encodeURIComponent(currentId)}&days=7`,
              controller.signal,
            )
          : Promise.reject(new Error('no current station')),
      ])
      if (controller.signal.aborted) return
      const tides =
        tRes.status === 'fulfilled' && Array.isArray(tRes.value) ? tRes.value : null
      const currents =
        cRes.status === 'fulfilled' && Array.isArray(cRes.value) ? cRes.value : null
      if (tides === null && currents === null) {
        setState({ status: 'error' })
        return
      }
      const data: Data = { tides, currents }
      cache.set(key, { at: Date.now(), data })
      setState({ status: 'success', data })
    }
    load().catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })
    return () => controller.abort()
  }, [spotId, tideStationId, currentStationId])

  if (state.status === 'loading') {
    return <p className="text-sm text-header">Loading 7-day tide &amp; current data…</p>
  }
  if (state.status === 'error') {
    return <p className="text-sm text-[#535c71]">7-day conditions unavailable.</p>
  }

  const tidesByDay = groupByDay(state.data.tides ?? [], (t) => t.t)
  const currentsByDay = groupByDay(state.data.currents ?? [], (c) => c.Time)
  const days = Array.from(
    new Set([...tidesByDay.keys(), ...currentsByDay.keys()]),
  ).sort()

  if (days.length === 0) {
    return <p className="text-sm text-[#535c71]">No items found.</p>
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {days.map((day) => {
        const tides = tidesByDay.get(day) ?? []
        const currents = currentsByDay.get(day) ?? []
        return (
          <div key={day} className="rounded-[5px] border border-body p-3">
            <p className="mb-2 font-mono text-sm font-bold text-header">
              {dayLabel(day)}
            </p>

            <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-wide text-header/70">
              Tides
            </p>
            <ul className="mb-3 mt-1 space-y-0.5">
              {tides.length === 0 ? (
                <li className="text-xs text-header">—</li>
              ) : (
                tides.map((t) => (
                  <li
                    key={`${t.t}-${t.type}`}
                    className="flex items-center justify-between gap-2 font-mono text-xs"
                  >
                    <span className="text-header">{t.type === 'H' ? 'High' : 'Low'}</span>
                    <span className="text-header">{timeOnly(t.t)}</span>
                    <span className="font-semibold text-ink">{t.v} ft</span>
                  </li>
                ))
              )}
            </ul>

            <p className="font-mono text-[0.7rem] font-semibold uppercase tracking-wide text-header/70">
              Currents
            </p>
            <ul className="mt-1 space-y-0.5">
              {currents.length === 0 ? (
                <li className="text-xs text-header">—</li>
              ) : (
                currents.map((c) => {
                  const { label, tone } = stageLabel(c.Velocity_Major)
                  return (
                    <li
                      key={`${c.Time}-${c.Type}`}
                      className="flex items-center justify-between gap-2 font-mono text-xs"
                    >
                      <span className={`font-semibold ${tone}`}>{label}</span>
                      <span className="text-header">{timeOnly(c.Time)}</span>
                      <span className="font-semibold text-ink">
                        {Math.abs(c.Velocity_Major).toFixed(1)} kt
                      </span>
                    </li>
                  )
                })
              )}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
