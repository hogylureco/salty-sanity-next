import { SITE_URL } from './taxonomy'

/**
 * Minimal schema.org builders. Values are passed as data (never string-
 * concatenated); the <JsonLd> component serializes with JSON.stringify and
 * escapes `<`, so user content can't break out of the <script> tag.
 */

export interface Crumb {
  name: string
  /** Absolute or root-relative path; omitted for the current (last) item. */
  path?: string
}

export function breadcrumbList(crumbs: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: `${SITE_URL}${crumb.path}` } : {}),
    })),
  }
}

export function placeSchema(input: {
  name: string
  description?: string | null
  latitude?: number | null
  longitude?: number | null
  url: string
}): Record<string, unknown> {
  const hasGeo =
    typeof input.latitude === 'number' && typeof input.longitude === 'number'
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: input.name,
    url: `${SITE_URL}${input.url}`,
    ...(input.description ? { description: input.description } : {}),
    ...(hasGeo
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: input.latitude,
            longitude: input.longitude,
          },
        }
      : {}),
  }
}
