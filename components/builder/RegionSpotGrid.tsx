'use client'

import { useEffect, useState } from 'react'

import { SpotCard, type SpotCardData } from '@/components/SpotCard'
import { publicClient } from '@/lib/sanity/public-client'
import { spotCardsByRegionQuery } from '@/lib/sanity/queries'

export interface RegionSpotGridProps {
  /** Region id prefix, e.g. "BB", "CCB", "NS" (identifier only). */
  regionCode?: string
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; spots: SpotCardData[] }

/**
 * Builder block rendering a grid of <SpotCard>s for a region, matched by the
 * spot `id` prefix (e.g. "BB." → Buzzards Bay). Content stays Sanity-owned.
 */
export function RegionSpotGrid({ regionCode }: RegionSpotGridProps) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const code = regionCode?.trim()
    if (!code) {
      setState({ status: 'ready', spots: [] })
      return
    }
    let active = true
    publicClient
      .fetch(spotCardsByRegionQuery, { code })
      .then((spots) => {
        if (active) setState({ status: 'ready', spots: (spots as SpotCardData[]) ?? [] })
      })
      .catch(() => {
        if (active) setState({ status: 'ready', spots: [] })
      })
    return () => {
      active = false
    }
  }, [regionCode])

  if (state.status === 'loading') return <div aria-busy="true">Loading spots…</div>
  if (state.spots.length === 0) {
    return <div>No spots found for region “{regionCode ?? ''}”.</div>
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
        gap: '1rem',
      }}
    >
      {state.spots.map((spot) => (
        <SpotCard key={spot._id} spot={spot} />
      ))}
    </div>
  )
}
