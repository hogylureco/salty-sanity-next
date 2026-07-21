/**
 * NOAA / National Weather Service forecast fetching. SERVER-ONLY: imported only
 * by `app/api/forecast/route.ts`. Uses Next's server `fetch` cache
 * (`next.revalidate`) so upstream NWS calls are shared and rate-limit-friendly.
 *
 * Flow (see lib/weather.ts for the returned shape):
 *   1. GET /points/{lat},{lng}          → grid + zone + nearest city.
 *   2. GET <points.forecast>            → LAND periods (temp/wind/sky).
 *      …if that 404s ("MarineForecastNotSupported"), the point is over water:
 *   3. GET /products/types/CWF/{office} → latest Coastal Waters Forecast id.
 *   4. GET /products/{id}               → text; extract the spot's ANZ### zone.
 *
 * NWS requires a descriptive User-Agent and rejects coordinates with more than
 * 4 decimal places (301), so we round.
 */
import type { ForecastPeriod, ForecastResponse } from './weather'

const NWS = 'https://api.weather.gov'
const UA =
  process.env.NWS_USER_AGENT || 'SaltyCape/1.0 (+https://saltycape.com)'

/** points→grid mapping is stable; cache it long. Forecast text: 30 min. */
const POINTS_TTL = 21_600
const FORECAST_TTL = 1_800

function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4
}

async function nwsFetch(
  url: string,
  revalidate: number,
  accept = 'application/geo+json',
): Promise<Response> {
  return fetch(url.startsWith('http') ? url : `${NWS}${url}`, {
    headers: { 'User-Agent': UA, Accept: accept },
    next: { revalidate },
  })
}

// --- Land ---------------------------------------------------------------------

interface NwsPeriod {
  name: string
  isDaytime: boolean
  temperature: number
  temperatureUnit: string
  windSpeed: string
  windDirection: string
  shortForecast: string
  detailedForecast: string
}

function mapLandPeriod(p: NwsPeriod): ForecastPeriod {
  return {
    name: p.name,
    isDaytime: p.isDaytime,
    temperature: p.temperature ?? null,
    temperatureUnit: p.temperatureUnit ?? null,
    windSpeed: p.windSpeed ?? null,
    windDirection: p.windDirection ?? null,
    shortForecast: p.shortForecast ?? null,
    detailedForecast: p.detailedForecast ?? null,
  }
}

// --- Marine (Coastal Waters Forecast text) ------------------------------------

/** Pull "ANZ232" out of ".../zones/forecast/ANZ232". */
function zoneIdFromUrl(url: string | undefined): string | null {
  if (!url) return null
  const m = url.match(/([A-Z]{3}\d{3})\/?$/)
  return m ? m[1] : null
}

/** Find the CWF segment (delimited by "$$") whose header is the given zone. */
function findZoneSegment(productText: string, zone: string): string | null {
  for (const seg of productText.split('$$')) {
    const header = seg.trim().split('\n')[0]?.trim() ?? ''
    if (header === zone || header.startsWith(`${zone}-`)) return seg
  }
  return null
}

/** ".TODAY...S winds 10 to 15 kt. Seas 2 to 3 ft." → {name:'Today', text:'…'} */
const PERIOD_RE = /^\.([A-Z][A-Z0-9 .'/-]*?)\.\.\.(.*)$/

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}

function parseMarinePeriods(body: string): ForecastPeriod[] {
  const periods: ForecastPeriod[] = []
  let cur: { name: string; parts: string[] } | null = null
  const flush = () => {
    if (cur) {
      periods.push({
        name: cur.name,
        text: cur.parts.join(' ').replace(/\s+/g, ' ').trim(),
      })
    }
  }
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    const m = line.match(PERIOD_RE)
    if (m) {
      flush()
      cur = { name: titleCase(m[1]), parts: [m[2]] }
    } else if (cur && line) {
      cur.parts.push(line)
    }
  }
  flush()
  return periods
}

/** First "...HEADLINE..." block that appears before the period list. */
function extractHeadline(preamble: string): string | null {
  const m = preamble.match(/\.\.\.\s*([\s\S]*?)\s*\.\.\./)
  return m ? m[1].replace(/\s+/g, ' ').trim() : null
}

async function getMarineForecast(
  office: string,
  zone: string,
): Promise<ForecastResponse | null> {
  const listRes = await nwsFetch(
    `/products/types/CWF/locations/${office}`,
    FORECAST_TTL,
    'application/ld+json',
  )
  if (!listRes.ok) return null
  const list = (await listRes.json()) as { '@graph'?: Array<{ id: string }> }
  const productId = list['@graph']?.[0]?.id
  if (!productId) return null

  const prodRes = await nwsFetch(`/products/${productId}`, FORECAST_TTL, 'application/ld+json')
  if (!prodRes.ok) return null
  const prod = (await prodRes.json()) as {
    productText?: string
    issuanceTime?: string
  }
  if (!prod.productText) return null

  const seg = findZoneSegment(prod.productText, zone)
  if (!seg) return null

  // line 0: "ANZ232-220000-"; line 1: zone name "Cape Cod Bay-"; then body.
  const lines = seg.trim().split('\n')
  const zoneName = (lines[1] ?? '').replace(/-\s*$/, '').trim() || zone
  const body = lines.slice(2).join('\n')

  const firstPeriod = body
    .split('\n')
    .findIndex((l) => PERIOD_RE.test(l.trim()))
  const preamble = firstPeriod >= 0 ? body.split('\n').slice(0, firstPeriod).join('\n') : ''
  const periodsText = firstPeriod >= 0 ? body.split('\n').slice(firstPeriod).join('\n') : body

  return {
    kind: 'marine',
    location: zoneName,
    updated: prod.issuanceTime ?? null,
    headline: extractHeadline(preamble),
    periods: parseMarinePeriods(periodsText),
  }
}

// --- Entry point --------------------------------------------------------------

interface PointsProps {
  forecast?: string
  forecastZone?: string
  cwa?: string
  relativeLocation?: { properties?: { city?: string; state?: string } }
}

export async function getForecast(
  lat: number,
  lng: number,
): Promise<ForecastResponse | null> {
  const pointsRes = await nwsFetch(
    `/points/${round4(lat)},${round4(lng)}`,
    POINTS_TTL,
  )
  if (!pointsRes.ok) return null
  const points = (await pointsRes.json()) as { properties?: PointsProps }
  const p = points.properties
  if (!p) return null

  const city = p.relativeLocation?.properties
  const location = city?.city ? `${city.city}, ${city.state ?? ''}`.trim() : null

  // Land first — the richer forecast. 404 here means the point is marine.
  if (p.forecast) {
    const fcRes = await nwsFetch(p.forecast, FORECAST_TTL)
    if (fcRes.ok) {
      const data = (await fcRes.json()) as {
        properties?: { updated?: string; periods?: NwsPeriod[] }
      }
      const periods = (data.properties?.periods ?? []).slice(0, 14).map(mapLandPeriod)
      if (periods.length > 0) {
        return {
          kind: 'land',
          location,
          updated: data.properties?.updated ?? null,
          periods,
        }
      }
    }
  }

  // Marine fallback via the Coastal Waters Forecast.
  const zone = zoneIdFromUrl(p.forecastZone)
  if (zone && p.cwa) {
    const marine = await getMarineForecast(p.cwa, zone)
    if (marine) return { ...marine, location: marine.location ?? location }
  }

  return null
}
