'use client'

import dynamic from 'next/dynamic'

import { type SpotsOverviewMapProps } from './mapConstants'

/**
 * Loads SpotsOverviewMap client-side only (`ssr: false`) so Leaflet's
 * browser-only code never runs during SSR and the /spots page stays static.
 * The spots page imports ONLY this loader — never SpotsOverviewMap directly.
 */
const SpotsOverviewMap = dynamic(() => import('./SpotsOverviewMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 480 }} aria-hidden="true">
      <p className="p-2 text-sm text-header">Loading map…</p>
    </div>
  ),
})

export function SpotsOverviewMapLoader(props: SpotsOverviewMapProps) {
  return <SpotsOverviewMap {...props} />
}
