'use client'

import { useEffect, useId, useRef, useState } from 'react'

import { track } from './track'
import { useVariant } from './useVariant'

/**
 * Waitlist email capture. ONE field. Progressive enhancement first:
 *
 *  • No JS  → a real `<form method="POST" action="/api/spotloc-signup">`. The
 *    proxy 303-redirects to /spotloc/thanks. It works with scripting off.
 *  • JS on  → submit is intercepted: validate on blur/submit, optimistic
 *    disabled state, success rendered IN PLACE (no redirect/alert), error keeps
 *    the typed email. Spam is caught by a honeypot + a fill-time check, no CAPTCHA.
 *
 * The submit button is the page's ONE primary action; its label is A/B-swappable
 * (the inline script in page.tsx rewrites `[data-variant-cta]` before paint).
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const INVALID_MSG = 'Enter an email like you@example.com.'
const UNAVAILABLE_MSG = 'We couldn’t reach the list just now. Try again in a minute.'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function SignupForm({
  section,
  ctaLabels,
  defaultCta,
}: {
  /** Which form fired the event — 'hero' or 'final'. */
  section: 'hero' | 'final'
  /** Button label per A/B variant id; resolved client-side, survives re-renders. */
  ctaLabels: Record<string, string>
  /** SSR/fallback label (variant A). */
  defaultCta: string
}) {
  const ctaLabel = useVariant(ctaLabels, defaultCta)
  const fieldId = useId()
  const errorId = `${fieldId}-error`
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const mountRef = useRef<number>(0)
  const inputRef = useRef<HTMLInputElement>(null)

  // Stamp mount time after render (Date.now() is impure — never during render).
  // Powers the server-side fill-time spam check.
  useEffect(() => {
    mountRef.current = Date.now()
  }, [])

  function validate(value: string): boolean {
    if (EMAIL_RE.test(value.trim())) {
      setError(null)
      return true
    }
    setError(INVALID_MSG)
    return false
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    track('form_submit', { section })
    if (!validate(email)) {
      track('form_error', { section, reason: 'invalid_email' })
      inputRef.current?.focus()
      return
    }
    setStatus('submitting')
    setError(null)
    try {
      const res = await fetch('/api/spotloc-signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          website: '', // honeypot stays empty on the JS path
          ts: mountRef.current,
          variant: document.documentElement.dataset.variant || 'a',
          source: 'spotloc-landing',
        }),
      })
      if (res.ok) {
        setStatus('success')
        track('signup_success', { section })
        return
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (data.error === 'invalid_email') {
        setStatus('idle')
        setError(INVALID_MSG)
        track('form_error', { section, reason: 'invalid_email' })
      } else {
        setStatus('error')
        setError(UNAVAILABLE_MSG)
        track('form_error', { section, reason: data.error || 'unavailable' })
      }
    } catch {
      setStatus('error')
      setError(UNAVAILABLE_MSG)
      track('form_error', { section, reason: 'network' })
    }
  }

  if (status === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-[5px] border border-green-dark/30 bg-green-dark/10 px-4 py-3.5"
      >
        <p className="font-mono text-sm font-semibold text-header">
          You’re on the list.
        </p>
        <p className="mt-0.5 text-sm text-ink">
          We’ll email you the day Spot Loc is ready. No spam, just the launch.
        </p>
      </div>
    )
  }

  const submitting = status === 'submitting'

  return (
    <form
      method="POST"
      action="/api/spotloc-signup"
      onSubmit={onSubmit}
      noValidate
      className="w-full"
    >
      {/* Hidden context for the no-JS path (JS supplies its own on submit). */}
      <input type="hidden" name="source" value="spotloc-landing" />
      {/* Honeypot: off-screen, not a display:none some bots skip. Real users
          never see or tab to it; a filled value is dropped server-side. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label htmlFor={`${fieldId}-website`}>Leave this field empty</label>
        <input
          id={`${fieldId}-website`}
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <label htmlFor={fieldId} className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          id={fieldId}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          disabled={submitting}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          onFocus={() => track('form_focus', { section })}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          onBlur={(e) => {
            if (e.target.value.trim()) validate(e.target.value)
          }}
          // 16px min font stops iOS zoom-on-focus; min-height ≥ 44px tap target.
          className="min-h-[44px] flex-1 rounded-[5px] border border-header/25 bg-box px-3.5 text-[16px] text-ink placeholder:text-header/50 focus:border-green-dark focus:outline-none focus:ring-2 focus:ring-green-dark/40 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={submitting}
          suppressHydrationWarning
          className="min-h-[44px] shrink-0 rounded-[5px] bg-green-dark px-6 font-mono text-[15px] font-semibold text-white transition-colors hover:bg-[#096b52] focus:outline-none focus:ring-2 focus:ring-green-dark/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting ? 'Adding you…' : ctaLabel}
        </button>
      </div>

      {error && (
        // Red-dark text (AA-compliant on white); #ff6b6b rides as the alert
        // accent on the border, never as text (it fails contrast as text).
        <p
          id={errorId}
          role="alert"
          className="mt-2 border-l-2 border-red-light pl-2.5 text-sm font-medium text-red-dark"
        >
          {error}
        </p>
      )}
      <p className="mt-2 text-xs text-header">One email when it launches. No spam, ever.</p>
    </form>
  )
}
