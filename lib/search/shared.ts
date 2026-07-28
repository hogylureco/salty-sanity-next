/**
 * Types and small data maps shared by the build-time index generator
 * (`build-index.ts`, server-only) and the client search UI. This module has NO
 * server dependencies (no Sanity client, no `server-only`) so it is safe to
 * import from client components.
 */

/** One indexed record. Shipped verbatim in `/search-index.json`. */
export type SearchDoc = {
  /** Stable unique key: `${_type}:${_id}` (uses the real schema `_type`). */
  key: string
  /** Logical facet type (structure + structureType collapse to `structure`). */
  type: LogicalType
  /** Display title, stega-cleaned. */
  title: string
  /** Region / parent context for disambiguation, stega-cleaned. */
  subtitle?: string
  /** Fully resolved href. */
  url: string
  /** Region name where derivable (spots, videos). */
  region?: string
  /** Match corpus: title + subtitle + region + flattened body, capped. */
  text: string
  /** Display excerpt (~160 chars, sentence-trimmed). */
  snippet?: string
}

/** The logical types a result can belong to — one per facet chip. */
export type LogicalType =
  | 'spot'
  | 'video'
  | 'structure'
  | 'approach'
  | 'species'
  | 'baitfish'
  | 'technique'
  | 'gear'
  | 'lure'
  | 'parentLure'
  | 'region'
  | 'season'
  | 'zone'
  | 'microSeason'

/** Facet display order (most-searched first). Drives grouping in the "All" view. */
export const TYPE_ORDER: LogicalType[] = [
  'spot',
  'video',
  'structure',
  'approach',
  'species',
  'baitfish',
  'technique',
  'gear',
  'lure',
  'parentLure',
  'region',
  'season',
  'zone',
  'microSeason',
]

/** Human labels for each logical type (facet chips, group headings, type tags). */
export const TYPE_LABELS: Record<LogicalType, string> = {
  spot: 'Spots',
  video: 'Videos',
  structure: 'Structures',
  approach: 'Approaches',
  species: 'Species',
  baitfish: 'Baitfish',
  technique: 'Techniques',
  gear: 'Gear',
  lure: 'Lures',
  parentLure: 'Parent Lures',
  region: 'Regions',
  season: 'Seasons',
  zone: 'Zones',
  microSeason: 'Micro Seasons',
}

/** Route segment each logical type deep-links to (`/${segment}/${slug}`). */
export const SEGMENT_BY_LOGICAL: Record<LogicalType, string> = {
  spot: 'spots',
  video: 'videos',
  structure: 'structures',
  approach: 'approaches',
  species: 'species',
  baitfish: 'baitfish',
  technique: 'techniques',
  gear: 'gear',
  lure: 'lures',
  parentLure: 'parent-lures',
  region: 'regions',
  season: 'seasons',
  zone: 'zones',
  microSeason: 'micro-seasons',
}
