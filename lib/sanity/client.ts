import { createClient, type QueryParams } from 'next-sanity'

import { dataset, projectId } from '../../sanity/env'

/**
 * API version is pinned to a date so query behavior is stable. Never "vX".
 */
const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || '2025-06-01'

/**
 * The imported Salty Cape content lives entirely in DRAFTS. In development we
 * read the `drafts` perspective (CDN off, so it's fresh and draft-visible); in
 * production we read only `published` content over the CDN.
 *
 * Draft reads are not anonymous, so dev additionally needs a read token
 * (`SANITY_API_READ_TOKEN`). Without it the drafts perspective returns nothing
 * and the site will look empty in dev — that's a missing token, not a bug.
 */
const isDev = process.env.NODE_ENV !== 'production'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: !isDev,
  perspective: isDev ? 'drafts' : 'published',
  token: isDev ? process.env.SANITY_API_READ_TOKEN : undefined,
})

/**
 * Thin fetch helper used by every route. Passing `tags` opts a query into
 * tag-based revalidation, so a Sanity webhook can later invalidate exactly the
 * affected pages with `revalidateTag(...)`. With no tags it falls back to
 * time-based revalidation.
 */
export async function sanityFetch<const QueryString extends string>({
  query,
  params = {},
  tags = [],
  revalidate = 3600,
}: {
  query: QueryString
  params?: QueryParams
  tags?: string[]
  revalidate?: number | false
}) {
  return client.fetch(query, params, {
    next: {
      revalidate: tags.length ? false : revalidate,
      tags,
    },
  })
}
