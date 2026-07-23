/**
 * Leaflet-free shared constants/types. Kept separate so `SpotMapLoader` can
 * import them WITHOUT statically importing `SpotMap` (which pulls Leaflet and
 * would run browser-only code during SSR). Leaflet only loads via the loader's
 * `next/dynamic(..., { ssr: false })`.
 */
export const MAP_HEIGHT = 400

/** Cap radius (nautical miles) inside which nearby markers count as "close". */
export const NEARBY_CAP_NMI = 5

/**
 * A clickable nearby-spot marker. Coordinates are already stega-cleaned and
 * validated to finite numbers by the page's data layer (see lib/nearby.ts), so
 * the map can trust them directly — no re-parsing.
 */
export interface NearbyMarker {
  /** Spot route slug (never null — slugless spots are dropped upstream). */
  slug: string
  name: string
  lat: number
  lng: number
  /** Great-circle distance from the current spot, in nautical miles. */
  distanceNmi: number
}

/** One marker on the /spots overview map (featured spot or boat ramp). */
export interface OverviewMarker {
  /** Spot `_id` — React/Leaflet key only. */
  id: string
  name: string
  /** Route slug, or null (some boat ramps have no page → no navigation). */
  slug: string | null
  lat: number
  lng: number
  kind: 'spot' | 'ramp'
}

export interface SpotsOverviewMapProps {
  markers: OverviewMarker[]
}

export interface SpotMapProps {
  lat: number | string | null | undefined
  lng: number | string | null | undefined
  name: string
  zoom?: number
  /** Overlay the XWeather sea-surface-temperature raster on the chart. */
  sstOverlay?: boolean
  /**
   * Nearby-spot markers to draw alongside the current-spot marker. Optional so
   * the embeddable/SST uses render exactly as before; only the spot dashboard
   * opts in. Empty or omitted → no nearby markers.
   */
  nearby?: NearbyMarker[]
  /**
   * Expand the view to fit the nearby markers. The page sets this true only when
   * every marker falls within `NEARBY_CAP_NMI`; otherwise the current spot stays
   * centered at its own zoom (a far outlier must not zoom the chart out).
   */
  fitNearbyBounds?: boolean
  /**
   * Draw always-visible name labels (permanent tooltips): the current spot's
   * navy chip and the nearby spots' seafoam "NEARBY" chips. On by default; an
   * embed can pass false to opt every label out. The current-spot label shows at
   * any zoom; nearby labels are gated by `minLabelZoom`.
   */
  showLabels?: boolean
  /**
   * Zoom at/above which nearby-spot labels appear; below it they're suppressed
   * (only the current-spot label stays) to keep a zoomed-out chart uncluttered.
   * Defaults to a sensible value inside SpotMap.
   */
  minLabelZoom?: number
}
