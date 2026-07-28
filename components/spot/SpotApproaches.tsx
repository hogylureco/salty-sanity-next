import Link from 'next/link'

import {
  SpotPortableText,
  type PortableTextValue,
} from '@/components/portable-text/SpotPortableText'

/**
 * One associated Approach document as projected on the spot (see
 * `approachProjection` in queries.ts). `featuredDiagramUrl` is a plain ImageKit
 * URL, not a Sanity asset; `description` is richText. Every field is
 * null-guarded — approaches arrive via weak refs, and even a resolved one may
 * carry no diagram or body.
 */
export interface SpotApproach {
  _id: string
  name: string | null
  slug: string | null
  featuredDiagramUrl: string | null
  description: PortableTextValue | null
}

function ApproachBlock({ approach }: { approach: SpotApproach }) {
  const { name, slug, featuredDiagramUrl, description } = approach
  const heading = name ?? approach._id
  return (
    <article className="border-t border-body pt-6 first:border-t-0 first:pt-0">
      <h3 className="font-mono text-base font-semibold text-header">
        {slug ? (
          <Link
            href={`/approaches/${slug}`}
            className="text-red-dark hover:underline underline-offset-2"
          >
            {heading}
          </Link>
        ) : (
          heading
        )}
      </h3>

      {featuredDiagramUrl && (
        // Plain ImageKit URL (not a Sanity asset), so a bare <img> — same
        // treatment as the gear rail's product images.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={featuredDiagramUrl}
          alt={name ? `${name} approach diagram` : 'Approach diagram'}
          loading="lazy"
          className="mt-3 w-full rounded-[5px] border border-body"
        />
      )}

      {description && (
        <div className="mt-2">
          <SpotPortableText value={description} />
        </div>
      )}
    </article>
  )
}

/**
 * The spot's "Approaches" body section: each associated Approach rendered with
 * its route diagram and description. Filters the weak-ref array to what actually
 * resolved; the parent SectionBox owns the empty state.
 */
export function SpotApproaches({
  approaches,
}: {
  approaches: Array<SpotApproach | null> | null
}) {
  const resolved = (approaches ?? []).filter(
    (a): a is SpotApproach => a != null,
  )
  if (resolved.length === 0) {
    return <p className="text-sm text-[#535c71]">No items found.</p>
  }
  return (
    <div className="space-y-6">
      {resolved.map((a) => (
        <ApproachBlock key={a._id} approach={a} />
      ))}
    </div>
  )
}
