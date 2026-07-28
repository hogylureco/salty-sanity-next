'use client'

import dynamic from 'next/dynamic'

import { type RegionsOverviewMapProps } from './mapConstants'

/**
 * Loads RegionsOverviewMap client-side only (`ssr: false`) so Leaflet's
 * browser-only code never runs during SSR and the /regions page stays static.
 * The regions page imports ONLY this loader — never RegionsOverviewMap directly.
 */
const RegionsOverviewMap = dynamic(() => import('./RegionsOverviewMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 480 }} aria-hidden="true">
      <p className="p-2 text-sm text-header">Loading map…</p>
    </div>
  ),
})

export function RegionsOverviewMapLoader(props: RegionsOverviewMapProps) {
  return <RegionsOverviewMap {...props} />
}
