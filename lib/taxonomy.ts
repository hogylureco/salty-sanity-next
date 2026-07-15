/**
 * Taxonomy route registry. Each entry is one URL segment; `types` is the set of
 * Sanity document types it covers (only `/structures` spans two — `structure` in
 * drafts, `structureType` in published). `mode` is intentionally absent: it has
 * no slug field, so it gets no route. `video` is deferred to a later phase.
 */
export interface TaxonomyConfig {
  segment: string
  types: string[]
  label: string
}

export const TAXONOMIES: TaxonomyConfig[] = [
  { segment: 'species', types: ['targetSpecies'], label: 'Species' },
  { segment: 'structures', types: ['structure', 'structureType'], label: 'Structures' },
  { segment: 'approaches', types: ['approach'], label: 'Approaches' },
  { segment: 'techniques', types: ['techniqueRetrieve'], label: 'Techniques' },
  { segment: 'lures', types: ['lureCatalog'], label: 'Lures' },
  { segment: 'gear', types: ['lureGearCategory'], label: 'Gear' },
  { segment: 'parent-lures', types: ['parentLure'], label: 'Parent Lures' },
  { segment: 'baitfish', types: ['baitfish'], label: 'Baitfish' },
  { segment: 'micro-seasons', types: ['microSeason'], label: 'Micro Seasons' },
  { segment: 'regions', types: ['region'], label: 'Regions' },
  { segment: 'seasons', types: ['season'], label: 'Seasons' },
  { segment: 'zones', types: ['zone'], label: 'Zones' },
]

/** Reverse map (doc `_type` → route segment) for the sitemap. */
export const SEGMENT_BY_TYPE: Record<string, string> = Object.fromEntries(
  TAXONOMIES.flatMap((t) => t.types.map((type) => [type, t.segment])),
)

/** Every taxonomy doc type, for the combined sitemap query. */
export const ALL_TAXONOMY_TYPES: string[] = TAXONOMIES.flatMap((t) => t.types)

// --- Region derivation --------------------------------------------------------
// The `region` reference resolves for only ~26% of spots and `macroRegion` is
// almost always empty, so region is derived primarily from the `id` prefix
// (approved in Step 0). This map is curated: some spot prefixes differ from the
// region doc's own code (`E`→Elizabeth Islands `EI`, `CC`→Cape Cod Canal `CCC`),
// and boat-ramp/other rows (`BR`, `OB`) carry the region in the 2nd segment.

export interface RegionRef {
  name: string
  slug: string | null
}

export const UNKNOWN_REGION: RegionRef = { name: 'Unknown region', slug: null }

const REGION_BY_PREFIX: Record<string, RegionRef> = {
  NS: { name: 'Nantucket Sound', slug: 'nantucket-sound' },
  CCB: { name: 'Cape Cod Bay', slug: 'cape-cod-bay' },
  BB: { name: 'Buzzards Bay', slug: 'buzzards-bay' },
  MO: { name: 'Monomoy', slug: 'monomoy' },
  VS: { name: 'Vineyard Sound', slug: 'vineyard-sound' },
  OC: { name: 'Outer Cape', slug: 'outer-cape' },
  E: { name: 'Elizabeth Islands', slug: 'elizabeth-islands' },
  EI: { name: 'Elizabeth Islands', slug: 'elizabeth-islands' },
  CC: { name: 'Cape Cod Canal', slug: 'cape-cod-canal' },
  CCC: { name: 'Cape Cod Canal', slug: 'cape-cod-canal' },
  NI: { name: 'Nantucket Island', slug: 'nantucket-island' },
  BI: { name: 'Block Island', slug: 'block-island' },
}

const SECOND_SEGMENT_PREFIXES = new Set(['BR', 'OB'])

/**
 * Best-effort region for a spot: id-prefix map first, then the resolved region
 * ref, then an "Unknown region" bucket. The underlying data messiness is an
 * import-pipeline concern, not a frontend one.
 */
export function regionForSpot(
  id: string | null | undefined,
  fallbackName?: string | null,
  fallbackSlug?: string | null,
): RegionRef {
  if (id) {
    const segments = id.split('.')
    let prefix = segments[0]
    if (SECOND_SEGMENT_PREFIXES.has(prefix) && segments[1]) prefix = segments[1]
    const hit = REGION_BY_PREFIX[prefix]
    if (hit) return hit
  }
  if (fallbackName) return { name: fallbackName, slug: fallbackSlug ?? null }
  return UNKNOWN_REGION
}

/** Both id forms for a reverse `references()` lookup (plain + `drafts.`-prefixed). */
export function bothIdForms(id: string): string[] {
  const plain = id.startsWith('drafts.') ? id.slice('drafts.'.length) : id
  return [plain, `drafts.${plain}`]
}

/** Absolute site origin for sitemap/robots/JSON-LD. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
).replace(/\/$/, '')
