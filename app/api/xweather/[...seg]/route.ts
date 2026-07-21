import { NextResponse, type NextRequest } from 'next/server'

/**
 * XWeather raster map-tile proxy. The tile URL embeds the credentials in its
 * path (`{client_id}_{client_secret}`), so it MUST be proxied server-side —
 * exposing it to the browser would leak the secret. Leaflet points a tile layer
 * at `/api/xweather/{layer}/{z}/{x}/{y}`; we fetch the matching XWeather tile and
 * stream the PNG back same-origin. Only allow-listed layers are proxied.
 */
export const runtime = 'nodejs'

const ALLOWED_LAYERS = new Set(['maritime-sst'])
const TILE_TTL = 10_800 // 3h — SST updates every ~6h

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ seg: string[] }> },
) {
  const { seg } = await ctx.params
  const [layer, z, x, y] = seg ?? []

  const validCoords = [z, x, y].every((v) => /^\d+$/.test(v ?? ''))
  if (!layer || !ALLOWED_LAYERS.has(layer) || !validCoords) {
    return new NextResponse('Bad tile request', { status: 400 })
  }

  const id = process.env.XWEATHER_CLIENT_ID
  const secret = process.env.XWEATHER_CLIENT_SECRET
  // No creds (or upstream miss) → 204 so Leaflet just shows no overlay tile,
  // never a broken-image icon, and the chart underneath stays visible.
  if (!id || !secret) return new NextResponse(null, { status: 204 })

  const url = `https://maps.api.xweather.com/${id}_${secret}/${layer}/${z}/${x}/${y}/current.png`
  try {
    const upstream = await fetch(url, { next: { revalidate: TILE_TTL } })
    if (!upstream.ok) return new NextResponse(null, { status: 204 })
    const body = await upstream.arrayBuffer()
    return new NextResponse(body, {
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'image/png',
        'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=86400',
      },
    })
  } catch {
    return new NextResponse(null, { status: 204 })
  }
}
