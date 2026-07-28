'use client'

import dynamic from 'next/dynamic'

/**
 * The sticky CTA bar and the analytics observers are NOT needed for the first
 * paint — the sticky bar only matters after scroll, analytics fires on view.
 * Loading them via `next/dynamic({ ssr: false })` splits them into a chunk that
 * downloads and hydrates AFTER the critical hero, cutting main-thread work
 * before LCP. The hero SignupForm stays eager (it's part of the LCP region).
 */
const LandingAnalytics = dynamic(
  () => import('./LandingAnalytics').then((m) => m.LandingAnalytics),
  { ssr: false },
)
const StickyCtaBar = dynamic(
  () => import('./StickyCtaBar').then((m) => m.StickyCtaBar),
  { ssr: false },
)

export function DeferredIslands({
  ctaLabels,
  defaultCta,
}: {
  ctaLabels: Record<string, string>
  defaultCta: string
}) {
  return (
    <>
      <LandingAnalytics />
      <StickyCtaBar ctaLabels={ctaLabels} defaultCta={defaultCta} />
    </>
  )
}
