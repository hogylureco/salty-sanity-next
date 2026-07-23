/**
 * Nearby-spot markers for the spot chart, built in the page's data layer (server)
 * so SSG/ISR is preserved — nothing here runs client-side at request time.
 *
 * Source is the curated `nearbySpots` weak-reference field (Sanity is the single
 * source of truth). Coordinates are scalar lat/lng numbers, not a geopoint, so
 * distance is a plain haversine. Every weak ref is null-guarded and every coord
 * and slug is stega-cleaned before parsing — a stega-tainted value would NaN out
 * a coordinate or 404 a route.
 */
import { stegaClean } from '@sanity/client/stega'

import type { NearbyMarker } from '@/components/map/mapConstants'
import { NEARBY_CAP_NMI } from '@/components/map/mapConstants'
import { regionForSpot } from '@/lib/taxonomy'

/** Mean Earth radius in nautical miles (1 nmi = 1.852 km). */
const EARTH_RADIUS_NMI = 3440.065

/** Most markers we'll ever draw, nearest first. */
const NEARBY_MAX = 10

/** The fields lib/nearby needs off each dereferenced `nearbySpots` item. */
export interface RawNearbySpot {
  _id: string
  name: string | null
  id: string | null
  slug: string | null
  latitude: number | null
  longitude: number | null
}

export interface NearbyResult {
  markers: NearbyMarker[]
  /** True when every returned marker is within NEARBY_CAP_NMI (drives fitBounds). */
  allWithinCap: boolean
}

/** Stega-clean → finite number, or null. Mirrors SpotMap's `toCoord`. */
function cleanNum(value: unknown): number | null {
  const cleaned = stegaClean(value)
  if (cleaned === null || cleaned === undefined || cleaned === '') return null
  const n = typeof cleaned === 'number' ? cleaned : Number(cleaned)
  return Number.isFinite(n) ? n : null
}

/** Stega-clean → non-empty string, or null. */
function cleanStr(value: unknown): string | null {
  const cleaned = stegaClean(value)
  return typeof cleaned === 'string' && cleaned !== '' ? cleaned : null
}

function haversineNmi(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_NMI * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Turn a spot's curated `nearbySpots` into map markers.
 *
 * - Excludes the current spot by matching the human `id` (not `_id`).
 * - Drops any ref that dangled (null), or is missing a slug or coordinates.
 * - Prefers same-region neighbors (id-prefix, see lib/taxonomy) so a straight-
 *   line-near spot across the Canal or a sound doesn't crowd out true neighbors;
 *   cross-region refs only fill the remaining slots up to NEARBY_MAX.
 * - Empty in → empty out (the chart simply draws no nearby markers).
 */
export function buildNearbyMarkers(
  origin: { id: string | null; latitude: number | null; longitude: number | null },
  nearbySpots: Array<RawNearbySpot | null> | null | undefined,
): NearbyResult {
  const originLat = cleanNum(origin.latitude)
  const originLng = cleanNum(origin.longitude)
  if (originLat === null || originLng === null) {
    return { markers: [], allWithinCap: true }
  }

  const originId = cleanStr(origin.id)
  const originRegion = regionForSpot(originId).slug

  const scored: Array<NearbyMarker & { sameRegion: boolean }> = []
  for (const item of nearbySpots ?? []) {
    if (!item) continue // dangling weak ref
    const slug = cleanStr(item.slug)
    const lat = cleanNum(item.latitude)
    const lng = cleanNum(item.longitude)
    if (!slug || lat === null || lng === null) continue
    const id = cleanStr(item.id)
    if (id && originId && id === originId) continue // exclude self by `id`
    scored.push({
      slug,
      name: cleanStr(item.name) ?? id ?? slug,
      lat,
      lng,
      distanceNmi: haversineNmi(originLat, originLng, lat, lng),
      sameRegion: regionForSpot(id).slug === originRegion,
    })
  }

  // Same-region first, then nearest — so cross-water refs only backfill.
  scored.sort((a, b) => {
    if (a.sameRegion !== b.sameRegion) return a.sameRegion ? -1 : 1
    return a.distanceNmi - b.distanceNmi
  })

  const markers: NearbyMarker[] = scored.slice(0, NEARBY_MAX).map((m) => ({
    slug: m.slug,
    name: m.name,
    lat: m.lat,
    lng: m.lng,
    distanceNmi: m.distanceNmi,
  }))
  const allWithinCap =
    markers.length > 0 && markers.every((m) => m.distanceNmi <= NEARBY_CAP_NMI)

  return { markers, allWithinCap }
}
