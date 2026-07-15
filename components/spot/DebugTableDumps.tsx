'use client'

import { useSearchParams } from 'next/navigation'

/**
 * Content-QA affordance: dumps each narrative's raw `richTableBlock` JSON when
 * `?debug=1` is in the URL. It's a CLIENT component reading `useSearchParams()`
 * (rather than the page reading `searchParams`), so the spot page itself stays
 * statically rendered (SSG). Must be wrapped in <Suspense> by the caller.
 *
 * Trade-off: the block JSON is serialized into the page payload so the client can
 * render it on demand — acceptable for a debug tool; swap for an on-demand fetch
 * if payload size ever matters.
 */
export interface DebugDumpGroup {
  field: string
  blocks: Array<{ _key?: string } & Record<string, unknown>>
}

export function DebugTableDumps({ groups }: { groups: DebugDumpGroup[] }) {
  const enabled = useSearchParams().get('debug') === '1'
  if (!enabled || groups.length === 0) return null
  return (
    <section>
      <h2>Debug — richTableBlock JSON (?debug=1)</h2>
      {groups.flatMap((group) =>
        group.blocks.map((block, index) => (
          <details key={`${group.field}-${block._key ?? index}`}>
            <summary>
              {group.field} — richTableBlock (raw JSON — ?debug=1)
            </summary>
            <pre>{JSON.stringify(block, null, 2)}</pre>
          </details>
        )),
      )}
    </section>
  )
}
