'use client'

import { useEffect, useState } from 'react'

import { track } from './track'
import { useVariant } from './useVariant'

/**
 * Mobile-only sticky CTA. Appears once the hero form scrolls out of view and
 * hides again when the footer form scrolls in, so it never competes with a real
 * form that's on screen. Not a modal, not a timed overlay, not exit-intent —
 * just a persistent path back to the single action. Tapping it scrolls to the
 * footer form and focuses the field.
 */
export function StickyCtaBar({
  ctaLabels,
  defaultCta,
}: {
  ctaLabels: Record<string, string>
  defaultCta: string
}) {
  const ctaLabel = useVariant(ctaLabels, defaultCta)
  const [heroOut, setHeroOut] = useState(false)
  const [finalIn, setFinalIn] = useState(false)

  useEffect(() => {
    const hero = document.getElementById('hero-signup')
    const final = document.getElementById('final-signup')
    if (!hero || !final) return

    const heroObs = new IntersectionObserver(
      ([e]) => setHeroOut(!e.isIntersecting),
      { rootMargin: '-60px 0px 0px 0px' },
    )
    const finalObs = new IntersectionObserver(
      ([e]) => setFinalIn(e.isIntersecting),
      { rootMargin: '0px 0px -80px 0px' },
    )
    heroObs.observe(hero)
    finalObs.observe(final)
    return () => {
      heroObs.disconnect()
      finalObs.disconnect()
    }
  }, [])

  const show = heroOut && !finalIn

  function jumpToForm() {
    track('cta_click', { section: 'sticky' })
    const final = document.getElementById('final-signup')
    final?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    window.setTimeout(() => {
      final?.querySelector<HTMLInputElement>('input[type="email"]')?.focus({
        preventScroll: true,
      })
    }, 500)
  }

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-header/15 bg-box/95 backdrop-blur transition-transform duration-200 sm:hidden ${
        show ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="min-w-0 flex-1 text-sm text-header">
          Get notified at launch.
        </span>
        <button
          type="button"
          onClick={jumpToForm}
          tabIndex={show ? 0 : -1}
          suppressHydrationWarning
          className="min-h-[44px] shrink-0 rounded-[5px] bg-green-dark px-5 font-mono text-[15px] font-semibold text-white transition-colors hover:bg-[#096b52] focus:outline-none focus:ring-2 focus:ring-green-dark/50"
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  )
}
