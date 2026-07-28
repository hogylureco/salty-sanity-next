/**
 * Client-side conversion instrumentation for the Spot Loc landing page.
 *
 * Every event is POSTed to the same-origin `/api/spotloc-event` proxy, which
 * forwards to the Worker `/event` route (Step 0 decision). `sendBeacon` is used
 * so events survive the page unloading on a CTA click; analytics NEVER throws
 * into the page. The shown A/B variant rides on every payload so a test is
 * attributable.
 */
'use client'

export type TrackEvent =
  | 'hero_view'
  | 'cta_click'
  | 'form_focus'
  | 'form_submit'
  | 'form_error'
  | 'signup_success'
  | 'scroll_depth'
  | 'section_view'

export function track(event: TrackEvent, payload: Record<string, unknown> = {}): void {
  try {
    const variant = document.documentElement.dataset.variant || 'a'
    const body = JSON.stringify({
      event,
      variant,
      path: window.location.pathname,
      ts: Date.now(),
      ...payload,
    })
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(
        '/api/spotloc-event',
        new Blob([body], { type: 'application/json' }),
      )
      return
    }
    // Fallback: keepalive fetch so the request outlives a navigation.
    void fetch('/api/spotloc-event', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Instrumentation must never break the page.
  }
}
