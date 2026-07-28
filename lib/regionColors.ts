/**
 * Region → colour assignment for the /regions overview map, legend, and grid
 * thumbnails. Colours are the dataviz skill's validated 8-hue categorical
 * palette (light mode), assigned to regions in a FIXED order — colour follows
 * the region, never its spot count, so a filter never repaints the survivors.
 *
 * Validated with `scripts/validate_palette.js --mode light`: CVD separation
 * passes (worst adjacent ΔE 24.2). Three hues fall below 3:1 contrast on the
 * light chart surface, so every use pairs the colour with a secondary encoding:
 * a white marker ring plus the always-present, labelled legend and region names.
 *
 * This module is client-safe (no server deps) so the client map and the server
 * page/thumbnail can all import it.
 */

export interface RegionColor {
  slug: string
  name: string
  /** Hex fill for markers, legend swatches, and card accents. */
  color: string
}

/**
 * Fixed order = palette slots 1–8 (the CVD-safe adjacency the validator
 * derived). Roughly west→east across the Cape. Regions with no spots simply
 * never appear in the legend/grid; the colour stays reserved for them regardless.
 */
export const REGION_PALETTE: RegionColor[] = [
  { slug: 'buzzards-bay', name: 'Buzzards Bay', color: '#2a78d6' }, // blue
  { slug: 'elizabeth-islands', name: 'Elizabeth Islands', color: '#1baf7a' }, // aqua
  { slug: 'vineyard-sound', name: 'Vineyard Sound', color: '#eda100' }, // yellow
  { slug: 'cape-cod-canal', name: 'Cape Cod Canal', color: '#008300' }, // green
  { slug: 'cape-cod-bay', name: 'Cape Cod Bay', color: '#4a3aa7' }, // violet
  { slug: 'nantucket-sound', name: 'Nantucket Sound', color: '#e34948' }, // red
  { slug: 'monomoy', name: 'Monomoy', color: '#e87ba4' }, // magenta
  { slug: 'outer-cape', name: 'Outer Cape', color: '#eb6834' }, // orange
]

const BY_SLUG = new Map(REGION_PALETTE.map((r) => [r.slug, r]))

/** Neutral for any region outside the fixed palette (e.g. an unmapped bucket). */
export const FALLBACK_REGION_COLOR = '#8a8f98'

/** Palette order index for a slug (for stable sorting), or a large number. */
export function regionOrder(slug: string | null): number {
  if (!slug) return Number.MAX_SAFE_INTEGER
  const i = REGION_PALETTE.findIndex((r) => r.slug === slug)
  return i === -1 ? Number.MAX_SAFE_INTEGER : i
}

export function regionColor(slug: string | null): string {
  return (slug && BY_SLUG.get(slug)?.color) || FALLBACK_REGION_COLOR
}
