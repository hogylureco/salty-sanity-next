'use client'

import { useEffect, useState } from 'react'

import { SpotCard, type SpotCardData } from '@/components/SpotCard'
import { publicClient } from '@/lib/sanity/public-client'
import { spotCardBySlugQuery } from '@/lib/sanity/queries'

export interface SpotCardBlockProps {
  /** Sanity spot slug (identifier only — never content). */
  spotSlug?: string
}

type State =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ok'; spot: SpotCardData }

/**
 * Builder block that renders the existing <SpotCard> for a spot slug. Sanity
 * stays the content authority — the editor supplies only an identifier. Fetches
 * client-side from the public (published) perspective.
 */
export function SpotCardBlock({ spotSlug }: SpotCardBlockProps) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    if (!spotSlug) {
      setState({ status: 'empty' })
      return
    }
    let active = true
    publicClient
      .fetch(spotCardBySlugQuery, { slug: spotSlug })
      .then((spot) => {
        if (active) {
          setState(
            spot ? { status: 'ok', spot: spot as SpotCardData } : { status: 'empty' },
          )
        }
      })
      .catch(() => {
        if (active) setState({ status: 'empty' })
      })
    return () => {
      active = false
    }
  }, [spotSlug])

  if (state.status === 'loading') return <div aria-busy="true">Loading spot…</div>
  // Quiet placeholder — a bad slug must never crash the marketing page.
  if (state.status === 'empty') return <div>Spot unavailable.</div>
  return <SpotCard spot={state.spot} />
}
