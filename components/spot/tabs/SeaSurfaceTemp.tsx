'use client'

import { useEffect, useState } from 'react'

import { type SstReading, fetchSst } from '@/lib/weather'

/**
 * Sea-surface temperature readout (Weather tab). Fetched client-side from our
 * /api/sst route, which proxies XWeather server-side. Renders a quiet
 * "unavailable" state when SST isn't offered for the point or XWeather isn't
 * configured — never an error banner. See lib/weather.ts.
 */
export interface SeaSurfaceTempProps {
  lat: number | null
  lng: number | null
}

const CACHE_TTL = 60 * 60 * 1000
const cache = new Map<string, { at: number; data: SstReading }>()

type State =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | { status: 'success'; data: SstReading }

const eyebrow =
  'font-mono text-sm font-semibold uppercase tracking-wider text-header'

function observedLabel(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d)
}

export function SeaSurfaceTemp({ lat, lng }: SeaSurfaceTempProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const servable = typeof lat === 'number' && typeof lng === 'number'

  useEffect(() => {
    if (!servable) {
      setState({ status: 'unavailable' })
      return
    }
    const key = `sst:${lat},${lng}`
    const cached = cache.get(key)
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setState({ status: 'success', data: cached.data })
      return
    }
    const controller = new AbortController()
    fetchSst(lat as number, lng as number, controller.signal)
      .then((data) => {
        cache.set(key, { at: Date.now(), data })
        setState({ status: 'success', data })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'unavailable' })
      })
    return () => controller.abort()
  }, [servable, lat, lng])

  return (
    <div className="box">
      <h2 className={eyebrow}>Sea Surface Temperature</h2>
      <hr className="my-3 border-body" />
      {state.status === 'loading' ? (
        <p className="text-sm text-header">Loading sea temperature…</p>
      ) : state.status === 'unavailable' ? (
        <p className="text-sm text-[#535c71]">
          Sea surface temperature unavailable for this location.
        </p>
      ) : (
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-3xl font-bold text-ink">
            {Math.round(state.data.tempF)}°F
          </span>
          {state.data.tempC != null && (
            <span className="font-mono text-sm text-header/70">
              {Math.round(state.data.tempC)}°C
            </span>
          )}
          {observedLabel(state.data.observed) && (
            <span className="font-mono text-xs text-header/60">
              as of {observedLabel(state.data.observed)} ET
            </span>
          )}
        </div>
      )}
      <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-wide text-header/60">
        Data from XWeather
      </p>
    </div>
  )
}
