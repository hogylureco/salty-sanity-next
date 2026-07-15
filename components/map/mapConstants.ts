/**
 * Leaflet-free shared constants/types. Kept separate so `SpotMapLoader` can
 * import them WITHOUT statically importing `SpotMap` (which pulls Leaflet and
 * would run browser-only code during SSR). Leaflet only loads via the loader's
 * `next/dynamic(..., { ssr: false })`.
 */
export const MAP_HEIGHT = 400

export interface SpotMapProps {
  lat: number | string | null | undefined
  lng: number | string | null | undefined
  name: string
  zoom?: number
}
