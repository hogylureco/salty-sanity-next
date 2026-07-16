import type { ReactNode } from 'react'

/**
 * One center-column content Box: small muted icon + Inconsolata title, a thin
 * rule, then content. Every section renders even when empty — the empty state
 * ("No items found.", #535c71) preserves the audit surface in production styling.
 * `scroll-mt-28` keeps the sticky tab bar from covering the heading on jump.
 */
export function SectionBox({
  id,
  title,
  icon,
  isEmpty,
  children,
}: {
  id: string
  title: string
  icon: string
  isEmpty: boolean
  children?: ReactNode
}) {
  return (
    <section id={id} className="box scroll-mt-28">
      <div className="flex items-center gap-2">
        <span aria-hidden className="text-sm text-header/60">
          {icon}
        </span>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider text-header">
          {title}
        </h2>
      </div>
      <hr className="my-3 border-body" />
      {isEmpty ? (
        <p className="text-sm text-[#535c71]">No items found.</p>
      ) : (
        children
      )}
    </section>
  )
}
