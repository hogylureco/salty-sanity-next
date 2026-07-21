'use client'

import { useEffect, useState } from 'react'

import { type CurrentEvent, fetchWorkerJson } from '@/lib/worker'
import {
  PILL,
  dayLabel,
  groupWindowsByDay,
  toPeakWindows,
} from '@/lib/peak-windows'

/**
 * 7-day peak fishing windows for the Fishing Times tab — the same ±45-minutes
 * around peak ebb/flood shown in the dashboard "Peak Fishing Times Today" box,
 * expanded across the week and grouped by day. Current predictions only (slack
 * turns excluded). Fetched client-side; same Worker CORS caveat as the other
 * conditions modules.
 */
export interface SevenDayPeakWindowsProps {
  spotId: string
  currentStationId: string | null
}

const CACHE_TTL = 5 * 60 * 1000
const cache = new Map<string, { at: number; data: CurrentEvent[] }>()

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; currents: CurrentEvent[] }

export function SevenDayPeakWindows({
  spotId,
  currentStationId,
}: SevenDayPeakWindowsProps) {
  const [state, setState] = useState<State>({ status: 'loading' })

  // Peak windows come entirely from current predictions, so a spot with no
  // current station id can't be served (the Worker requires an explicit id and
  // has no nearest-by-coords lookup) — quiet "unavailable" state, not an error.
  const currentId = currentStationId?.trim() || null
  const servable = Boolean(currentId)

  useEffect(() => {
    if (!servable || !currentId) return
    const key = `7dpeak:${spotId}`
    const cached = cache.get(key)
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setState({ status: 'success', currents: cached.data })
      return
    }
    const controller = new AbortController()

    async function load() {
      const currents = await fetchWorkerJson<CurrentEvent[]>(
        `/currents?station=${encodeURIComponent(currentId!)}&days=7`,
        controller.signal,
      )
      if (controller.signal.aborted) return
      if (!Array.isArray(currents)) {
        setState({ status: 'error' })
        return
      }
      cache.set(key, { at: Date.now(), data: currents })
      setState({ status: 'success', currents })
    }
    load().catch(() => {
      if (!controller.signal.aborted) setState({ status: 'error' })
    })
    return () => controller.abort()
  }, [spotId, currentId, servable])

  if (!servable) {
    return (
      <p className="text-sm text-header/70">
        Peak fishing times unavailable for this location.
      </p>
    )
  }
  if (state.status === 'loading') {
    return <p className="text-sm text-header">Loading 7-day peak windows…</p>
  }
  if (state.status === 'error') {
    return <p className="text-sm text-[#535c71]">Peak windows unavailable.</p>
  }

  const days = groupWindowsByDay(toPeakWindows(state.currents))
  if (days.length === 0) {
    return (
      <p className="text-sm text-header">
        No peak windows in the current forecast.
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {days.map(({ day, windows }) => (
          <div key={day} className="rounded-[5px] border border-body p-3">
            <p className="mb-2 font-mono text-sm font-bold text-header">
              {dayLabel(day)}
            </p>
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
          </div>
        ))}
      </div>

      {/* Why these windows: peak current is when fishing is best. */}
      <p className="mt-4 text-xs leading-relaxed text-header/70">
        Best bite is the ~90 minutes around maximum current — 45 minutes either
        side of peak ebb and peak flood — when the moving water sweeps bait off
        structure and gamefish feed hardest. The slack tide in between is the slow
        window.
      </p>
    </>
  )
}
