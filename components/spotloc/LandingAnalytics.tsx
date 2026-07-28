'use client'

import { useEffect } from 'react'

import { track } from './track'

/**
 * Page-level instrumentation, mounted once. Fires:
 *  • hero_view      — when the hero form first enters the viewport
 *  • section_view   — once per element tagged `data-section-view="<name>"`
 *                     (the mechanism section is the decision point)
 *  • scroll_depth   — at 25 / 50 / 75 / 100 %, each once
 *
 * cta_click / form_* / signup_success are fired at their source (form, sticky
 * bar). Renders nothing.
 */
export function LandingAnalytics() {
  useEffect(() => {
    const cleanups: Array<() => void> = []

    // hero_view (once).
    const hero = document.getElementById('hero-signup')
    if (hero) {
      let fired = false
      const obs = new IntersectionObserver((entries) => {
        if (!fired && entries.some((e) => e.isIntersecting)) {
          fired = true
          track('hero_view')
          obs.disconnect()
        }
      })
      obs.observe(hero)
      cleanups.push(() => obs.disconnect())
    }

    // section_view (once each).
    const sections = document.querySelectorAll<HTMLElement>('[data-section-view]')
    if (sections.length) {
      const seen = new Set<string>()
      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            const name = (e.target as HTMLElement).dataset.sectionView
            if (e.isIntersecting && name && !seen.has(name)) {
              seen.add(name)
              track('section_view', { section: name })
            }
          }
        },
        { threshold: 0.4 },
      )
      sections.forEach((s) => obs.observe(s))
      cleanups.push(() => obs.disconnect())
    }

    // scroll_depth (25/50/75/100, once each).
    const thresholds = [25, 50, 75, 100]
    const hit = new Set<number>()
    const onScroll = () => {
      const doc = document.documentElement
      const scrollable = doc.scrollHeight - window.innerHeight
      const pct = scrollable <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / scrollable) * 100))
      for (const t of thresholds) {
        if (pct >= t && !hit.has(t)) {
          hit.add(t)
          track('scroll_depth', { depth: t })
        }
      }
      if (hit.size === thresholds.length) window.removeEventListener('scroll', onScroll)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    cleanups.push(() => window.removeEventListener('scroll', onScroll))

    return () => cleanups.forEach((fn) => fn())
  }, [])

  return null
}
