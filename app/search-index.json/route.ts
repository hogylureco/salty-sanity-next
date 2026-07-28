import { NextResponse } from 'next/server'

import { buildSearchIndex } from '@/lib/search/build-index'

/**
 * The static search-index artifact. `force-static` makes Next evaluate this at
 * BUILD time (and on the `revalidate` tick) and serve the result as a static
 * asset — there is no per-request Sanity query. `revalidate` matches the site's
 * page ISR window (3600s) so the index regenerates on the same cadence.
 *
 * Path is `/search-index.json` — a literal segment, no collision with any page
 * route or the (marketing) optional catch-all (route handlers take precedence).
 */
export const dynamic = 'force-static'
export const revalidate = 3600

export async function GET() {
  const index = await buildSearchIndex()
  return NextResponse.json(index, {
    headers: {
      // CDN holds it for the ISR window; SWR lets a stale copy serve while the
      // revalidate regenerates it in the background.
      'Cache-Control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
