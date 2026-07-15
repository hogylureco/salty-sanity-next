import { createClient } from 'next-sanity'

import { apiVersion, dataset, projectId } from '../../sanity/env'

/**
 * Browser-safe Sanity client: PUBLISHED perspective, no token, CDN on. The
 * `production` dataset is public-read, so this is safe to run in the client —
 * used by the Builder.io marketing components, which fetch card data after
 * hydration. Unlike the main `client` (which reads drafts + uses a token in
 * dev), this must never carry a token.
 */
export const publicClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
})
