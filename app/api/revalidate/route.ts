import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

import { SIGNATURE_HEADER_NAME, isValidSignature } from '@sanity/webhook'

import { ALL_TAXONOMY_TYPES } from '@/lib/taxonomy'

// revalidateTag() requires the Node.js runtime — it is not available on edge.
export const runtime = 'nodejs'

const TAXONOMY_TYPES = new Set(ALL_TAXONOMY_TYPES)

/** Payload shape defined by the webhook projection (see docs/sanity-webhook-setup.md). */
interface WebhookPayload {
  _type?: string
  slug?: string | null
  id?: string | null
  operation?: string
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get(SIGNATURE_HEADER_NAME)

  // Read the RAW body as text BEFORE parsing — `isValidSignature` must see the
  // exact bytes Sanity signed; re-encoding parsed JSON would break the check.
  const body = await req.text()

  const secret = process.env.SANITY_REVALIDATE_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: 'Server missing SANITY_REVALIDATE_SECRET' },
      { status: 500 },
    )
  }

  if (!signature || !(await isValidSignature(body, signature, secret))) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(body) as WebhookPayload
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { _type, slug } = payload

  // Canonical tag vocabulary: 'spot' (every publish), 'spot:<slug>' (spot detail),
  // '<type>:<slug>' (taxonomy detail). Delete/unpublish revalidate the same tags
  // so lists and the sitemap drop the doc.
  const tags: string[] = []
  if (_type === 'spot') {
    if (slug) tags.push(`spot:${slug}`)
    tags.push('spot')
  } else if (_type === 'video') {
    // Videos have no route of their own, but they render as cards in spot
    // pages' Videos tab (fetched under the 'video' tag). A video publish must
    // refresh those cards — 'video' hits every spot that fetched related
    // videos; 'spot' covers lists/sitemap that may surface video-derived data.
    tags.push('video')
    tags.push('spot')
  } else if (_type && TAXONOMY_TYPES.has(_type)) {
    if (slug) tags.push(`${_type}:${slug}`)
    // Spot pages render referenced taxonomy names, so a taxonomy change must
    // ripple to spot pages/lists/sitemap — hence the broad 'spot' tag too.
    tags.push('spot')
  } else {
    // Unknown/irrelevant type (e.g. mode, or a type with no route) — no-op, 200.
    return NextResponse.json({ skipped: true, _type: _type ?? null })
  }

  // Next 16 requires the two-arg form; 'max' gives stale-while-revalidate.
  for (const tag of tags) revalidateTag(tag, 'max')

  return NextResponse.json({ revalidated: tags, now: Date.now() })
}
