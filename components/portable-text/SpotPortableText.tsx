import Link from 'next/link'

import { PortableText, type PortableTextComponents } from '@portabletext/react'

import { RichTable, type RichTableBlockValue } from './RichTable'

/**
 * The exact `value` type `<PortableText>` accepts. Derived from the component
 * itself so we never drift from the library's own definition.
 */
export type PortableTextValue = Parameters<typeof PortableText>[0]['value']

/**
 * A link href is "internal" when it's a same-app path or in-page anchor — those
 * go through next/link. Everything else (absolute URLs, mailto:, tel:) is treated
 * as external and opened in a new tab. We can't reliably know our own host at
 * render time, so absolute same-host URLs are treated as external too.
 */
function isInternalHref(href: string): boolean {
  return href.startsWith('/') || href.startsWith('#')
}

/**
 * The site-wide Portable Text component map. Shared by all 7 spot narrative
 * fields, by richTableBlock cell content (recursively), and intended as the
 * default for future blog/species/approach body content. Structural/semantic
 * HTML only — no classes; styling is Phase 8.
 */
export const spotPortableTextComponents: PortableTextComponents = {
  block: {
    normal: ({ children }) => <p>{children}</p>,
    // `h1` isn't in the Phase 1 spec (h2–h4) but appears in real content; handle
    // it explicitly rather than leaning on the library default. Whether narrative
    // h1s should be down-shifted (the page already owns the <h1>) is a Phase 8 call.
    h1: ({ children }) => <h1>{children}</h1>,
    h2: ({ children }) => <h2>{children}</h2>,
    h3: ({ children }) => <h3>{children}</h3>,
    h4: ({ children }) => <h4>{children}</h4>,
    blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  },
  list: {
    bullet: ({ children }) => <ul>{children}</ul>,
    number: ({ children }) => <ol>{children}</ol>,
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    code: ({ children }) => <code>{children}</code>,
    // Present in the plugin's default cell content schema; render defensively.
    underline: ({ children }) => <u>{children}</u>,
    'strike-through': ({ children }) => <s>{children}</s>,
    link: ({ children, value }) => {
      const href = (value as { href?: string } | undefined)?.href ?? ''
      if (!href) return <>{children}</>
      if (isInternalHref(href)) return <Link href={href}>{children}</Link>
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      )
    },
  },
  types: {
    // Deferred to render time (arrow), which also keeps the SpotPortableText <->
    // RichTable module cycle from touching an un-initialised binding at eval.
    richTableBlock: ({ value }) => <RichTable value={value as RichTableBlockValue} />,
  },
  // Never crash on content the map doesn't know about — make the gap findable.
  unknownType: ({ value, isInline }) => {
    const type = (value as { _type?: string } | undefined)?._type
    console.warn(`[SpotPortableText] Unknown block type: ${type}`)
    return isInline ? (
      <span data-unknown-type={type} />
    ) : (
      <div data-unknown-type={type} />
    )
  },
  unknownMark: ({ children, markType }) => {
    console.warn(`[SpotPortableText] Unknown mark: ${markType}`)
    return <>{children}</>
  },
  unknownBlockStyle: ({ children }) => <p>{children}</p>,
  unknownList: ({ children }) => <ul>{children}</ul>,
  unknownListItem: ({ children }) => <li>{children}</li>,
}

/**
 * Shared renderer. Returns null for empty/absent content so callers don't render
 * a bare heading over nothing.
 */
export function SpotPortableText({
  value,
}: {
  value: PortableTextValue | null | undefined
}) {
  if (!value || (Array.isArray(value) && value.length === 0)) return null
  return <PortableText value={value} components={spotPortableTextComponents} />
}
