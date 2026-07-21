/**
 * Normalized NOAA forecast for a spot, plus the browser-side fetch helper.
 *
 * Weather comes from the National Weather Service (api.weather.gov), NOT the
 * Cloudflare Worker — NWS is free, keyless, and coordinate-based. Because most
 * Salty Cape spots sit over water, there are TWO shapes behind one type:
 *
 *   - `kind: 'land'`   → NWS gridpoint forecast: structured periods with air
 *                        temperature, wind, and a short sky description.
 *   - `kind: 'marine'` → NWS Coastal Waters Forecast (CWF): the spot's marine
 *                        zone text, parsed into per-period narratives (wind +
 *                        seas). NWS does not expose marine data as structured
 *                        JSON, so these periods carry `text`, not `temperature`.
 *
 * The `/api/forecast` route handler (server-side, cached) does the NWS calls and
 * returns this shape; components fetch it same-origin — no CORS, no Worker.
 */
export interface ForecastPeriod {
  /** "Today", "Tonight", "Wednesday"… */
  name: string
  isDaytime?: boolean
  /** Land only. */
  temperature?: number | null
  temperatureUnit?: string | null
  windSpeed?: string | null
  windDirection?: string | null
  shortForecast?: string | null
  detailedForecast?: string | null
  /** Marine only: the zone's narrative for this period (wind/seas). */
  text?: string | null
}

export interface ForecastResponse {
  kind: 'land' | 'marine'
  /** City+state (land) or marine zone name (marine); null if unknown. */
  location: string | null
  /** ISO timestamp the source product was issued/updated. */
  updated: string | null
  /** Marine advisory line (e.g. Small Craft Advisory), when present. */
  headline?: string | null
  periods: ForecastPeriod[]
}

/**
 * Fetch the normalized forecast for a coordinate from our own API route
 * (same-origin, so no CORS). Throws on non-2xx so callers hit their error state.
 */
export async function fetchForecast(
  lat: number,
  lng: number,
  signal: AbortSignal,
): Promise<ForecastResponse> {
  const res = await fetch(`/api/forecast?lat=${lat}&lng=${lng}`, { signal })
  if (!res.ok) throw new Error(`Forecast HTTP ${res.status}`)
  return (await res.json()) as ForecastResponse
}

/**
 * Sea-surface temperature for a coordinate. Sourced from XWeather's maritime
 * data API server-side (see /api/sst + lib/weather-xweather.ts) — the client
 * only ever sees this normalized reading, never the XWeather credentials.
 */
export interface SstReading {
  tempF: number
  tempC: number | null
  /** ISO timestamp of the reading. */
  observed: string | null
}

export async function fetchSst(
  lat: number,
  lng: number,
  signal: AbortSignal,
): Promise<SstReading> {
  const res = await fetch(`/api/sst?lat=${lat}&lng=${lng}`, { signal })
  if (!res.ok) throw new Error(`SST HTTP ${res.status}`)
  return (await res.json()) as SstReading
}
