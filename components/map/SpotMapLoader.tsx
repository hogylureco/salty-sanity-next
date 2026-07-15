'use client'

import dynamic from 'next/dynamic'

import { MAP_HEIGHT, type SpotMapProps } from './mapConstants'

/**
 * Loads SpotMap client-side only (`ssr: false`), so Leaflet's browser-only code
 * never runs during SSR and the spot page stays statically generated. The
 * loading placeholder reserves the map's height to avoid layout shift.
 *
 * The spot page imports ONLY this loader — never SpotMap directly.
 */
const SpotMap = dynamic(() => import('./SpotMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: MAP_HEIGHT }} aria-hidden="true">
      <p>Loading map…</p>
    </div>
  ),
})

export function SpotMapLoader(props: SpotMapProps) {
  return <SpotMap {...props} />
}
