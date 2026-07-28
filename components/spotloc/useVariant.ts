'use client'

import { useState } from 'react'

/**
 * Resolve a per-variant value on the client. The inline script in page.tsx sets
 * `document.documentElement.dataset.variant` BEFORE hydration, so this reads the
 * right value in a `useState` initializer — the label is then React state and
 * survives re-renders (a plain textContent swap would be reverted by the next
 * render). SSR returns the fallback; for a forced `?variant=`, hydration differs,
 * which is why the consuming element carries `suppressHydrationWarning`.
 */
export function useVariant<T>(map: Record<string, T>, fallback: T): T {
  const [value] = useState<T>(() => {
    if (typeof document === 'undefined') return fallback
    const id = document.documentElement.dataset.variant
    return (id && map[id]) || fallback
  })
  return value
}
