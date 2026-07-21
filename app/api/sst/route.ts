import { NextResponse, type NextRequest } from 'next/server'

import { getSst, isConfigured } from '@/lib/weather-xweather'

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

  // Distinct from "no data": a 503 tells us the XWeather env vars are missing.
  if (!isConfigured()) {
    return NextResponse.json(
      { error: 'XWeather not configured' },
      { status: 503 },
    )
  }

  try {
    const reading = await getSst(lat, lng)
    if (!reading) {
      return NextResponse.json(
        { error: 'Sea temp unavailable for this location' },
        { status: 404 },
      )
    }
    return NextResponse.json(reading, {
      headers: {
        'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=21600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'XWeather service error' }, { status: 502 })
  }
}
