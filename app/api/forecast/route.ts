import { NextResponse, type NextRequest } from 'next/server'

import { getForecast } from '@/lib/weather-noaa'

// NWS fetches + our upstream cache run on Node; this handler is dynamic because
// it reads lat/lng from the query. The upstream NWS calls are cached server-side
// (see lib/weather-noaa.ts); we also set a CDN Cache-Control so each unique
// coordinate response is reused at the edge.
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = Number(searchParams.get('lat'))
  const lng = Number(searchParams.get('lng'))

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return NextResponse.json({ error: 'Invalid lat/lng' }, { status: 400 })
  }

  try {
    const forecast = await getForecast(lat, lng)
    if (!forecast) {
      return NextResponse.json(
        { error: 'Forecast unavailable for this location' },
        { status: 404 },
      )
    }
    return NextResponse.json(forecast, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Weather service error' }, { status: 502 })
  }
}
