/**
 * XWeather (Aeris) maritime data — sea-surface temperature. SERVER-ONLY:
 * imported only by `app/api/sst/route.ts`. The credentials never leave the
 * server; the browser calls our /api/sst route, which returns just the reading.
 *
 * Endpoint (point query):
 *   GET https://data.api.xweather.com/maritime/{lat},{lng}
 *       ?client_id=…&client_secret=…&limit=1
 *   → { success, response: [{ periods: [{ seaSurfaceTemperatureF/C, dateTimeISO }] }] }
 *
 * SST changes slowly, so upstream calls are cached for hours.
 */
import type { SstReading } from './weather'

const BASE = 'https://data.api.xweather.com'
const SST_TTL = 10_800 // 3h

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4
}

export function isConfigured(): boolean {
  return Boolean(
    process.env.XWEATHER_CLIENT_ID && process.env.XWEATHER_CLIENT_SECRET,
  )
}

interface MaritimePeriod {
  dateTimeISO?: string
  seaSurfaceTemperatureF?: number | null
  seaSurfaceTemperatureC?: number | null
  // tolerate the shorter field names some XWeather responses use
  seaSurfaceTempF?: number | null
  seaSurfaceTempC?: number | null
}

export async function getSst(
  lat: number,
  lng: number,
): Promise<SstReading | null> {
  const id = process.env.XWEATHER_CLIENT_ID
  const secret = process.env.XWEATHER_CLIENT_SECRET
  if (!id || !secret) return null

  const url =
    `${BASE}/maritime/${round4(lat)},${round4(lng)}` +
    `?limit=1&client_id=${encodeURIComponent(id)}` +
    `&client_secret=${encodeURIComponent(secret)}`

  const res = await fetch(url, { next: { revalidate: SST_TTL } })
  if (!res.ok) return null

  const data = (await res.json()) as {
    success?: boolean
    response?: Array<{ periods?: MaritimePeriod[] }>
  }
  if (!data.success) return null

  const period = data.response?.[0]?.periods?.[0]
  if (!period) return null

  const tempF = period.seaSurfaceTemperatureF ?? period.seaSurfaceTempF
  const tempC = period.seaSurfaceTemperatureC ?? period.seaSurfaceTempC
  if (typeof tempF !== 'number') return null

  return {
    tempF,
    tempC: typeof tempC === 'number' ? tempC : null,
    observed: period.dateTimeISO ?? null,
  }
}
