'use client'

import { useEffect, useState } from 'react'

import { type ForecastResponse, fetchForecast } from '@/lib/weather'

/**
 * Weather tab — extended forecast from NOAA / National Weather Service.
 *
 * Land spots render the NWS gridpoint periods (Today/Tonight/… with temp, wind,
 * sky). Marine spots (the majority — shoals, ledges, rips) have no structured
 * NWS forecast, so we render the Coastal Waters Forecast zone narrative parsed
 * into per-period text. Fetched client-side (after hydration) from our own
 * /api/forecast route so the spot page stays static. See lib/weather.ts.
 */
export interface ExtendedForecastProps {
  lat: number | null
  lng: number | null
}

const CACHE_TTL = 30 * 60 * 1000
const cache = new Map<string, { at: number; data: ForecastResponse }>()

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'success'; data: ForecastResponse }

const eyebrow =
  'font-mono text-sm font-semibold uppercase tracking-wider text-header'

function attribution() {
  return (
    <p className="mt-4 font-mono text-[0.7rem] uppercase tracking-wide text-header/60">
      Data from NOAA / National Weather Service
    </p>
  )
}

export function ExtendedForecast({ lat, lng }: ExtendedForecastProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const servable = typeof lat === 'number' && typeof lng === 'number'

  useEffect(() => {
    if (!servable) return
    const key = `fc:${lat},${lng}`
    const cached = cache.get(key)
    if (cached && Date.now() - cached.at < CACHE_TTL) {
      setState({ status: 'success', data: cached.data })
      return
    }
    const controller = new AbortController()
    fetchForecast(lat as number, lng as number, controller.signal)
      .then((data) => {
        cache.set(key, { at: Date.now(), data })
        setState({ status: 'success', data })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      })
    return () => controller.abort()
  }, [servable, lat, lng])

  return (
    <div className="box">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={eyebrow}>Extended Forecast</h2>
        {state.status === 'success' && state.data.location && (
          <span className="font-mono text-xs text-header/70">
            {state.data.location}
          </span>
        )}
      </div>
      <hr className="my-3 border-body" />

      {!servable ? (
        <p className="text-sm text-header/70">
          Forecast unavailable — this spot has no coordinates.
        </p>
      ) : state.status === 'loading' ? (
        <p className="text-sm text-header">Loading forecast…</p>
      ) : state.status === 'error' ? (
        <p className="text-sm text-[#535c71]">Forecast unavailable right now.</p>
      ) : state.data.kind === 'land' ? (
        <LandForecast data={state.data} />
      ) : (
        <MarineForecast data={state.data} />
      )}

      {attribution()}
    </div>
  )
}

function LandForecast({ data }: { data: ForecastResponse }) {
  if (data.periods.length === 0) {
    return <p className="text-sm text-[#535c71]">No forecast periods.</p>
  }
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.periods.map((p) => (
        <div key={p.name} className="rounded-[5px] border border-body p-3">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-sm font-bold text-header">{p.name}</p>
            {typeof p.temperature === 'number' && (
              <p className="font-mono text-lg font-bold text-ink">
                {p.temperature}°{p.temperatureUnit ?? ''}
              </p>
            )}
          </div>
          {p.shortForecast && (
            <p className="mt-1 text-sm text-ink">{p.shortForecast}</p>
          )}
          {p.windSpeed && (
            <p className="mt-1 font-mono text-xs text-header/70">
              Wind {p.windDirection ? `${p.windDirection} ` : ''}
              {p.windSpeed}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

function MarineForecast({ data }: { data: ForecastResponse }) {
  return (
    <div className="space-y-3">
      {data.headline && (
        <p className="rounded-[5px] bg-body px-3 py-2 font-mono text-xs font-semibold uppercase tracking-wide text-red-dark">
          {data.headline}
        </p>
      )}
      {data.periods.length === 0 ? (
        <p className="text-sm text-[#535c71]">
          Marine forecast text unavailable for this zone.
        </p>
      ) : (
        <ul className="space-y-3">
          {data.periods.map((p) => (
            <li key={p.name} className="border-l-2 border-body pl-3">
              <p className="font-mono text-sm font-bold text-header">{p.name}</p>
              <p className="mt-0.5 text-sm text-ink">{p.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
