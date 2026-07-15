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
    // Body prose: IBM Plex Sans (default), #333, ~68ch measure, line-height ~1.65.
    normal: ({ children }) => (
      <p className="my-4 max-w-[68ch] leading-[1.65]">{children}</p>
    ),
    // Narrative h1 down-shifted visually (the page owns the real <h1>): render as
    // an h2-scale heading. IBM Plex Sans 600, #535c71.
    h1: ({ children }) => (
      <h2 className="mt-10 mb-3 max-w-[68ch] font-sans text-2xl font-semibold text-header">
        {children}
      </h2>
    ),
    h2: ({ children }) => (
      <h2 className="mt-10 mb-3 max-w-[68ch] font-sans text-2xl font-semibold text-header">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-2 max-w-[68ch] font-sans text-xl font-semibold text-header">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-6 mb-2 max-w-[68ch] font-sans text-lg font-semibold text-header">
        {children}
      </h4>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-5 max-w-[68ch] border-l-4 border-green-light pl-4 italic text-header">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="my-4 max-w-[68ch] list-disc space-y-1 pl-6 leading-[1.6]">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="my-4 max-w-[68ch] list-decimal space-y-1 pl-6 leading-[1.6]">
        {children}
      </ol>
    ),
  },
  listItem: {
    bullet: ({ children }) => <li>{children}</li>,
    number: ({ children }) => <li>{children}</li>,
  },
  marks: {
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em>{children}</em>,
    // Inline code: Inconsolata on #f9f9f9, subtle radius.
    code: ({ children }) => (
      <code className="rounded bg-body px-1 py-0.5 font-mono text-[0.9em]">
        {children}
      </code>
    ),
    underline: ({ children }) => <u>{children}</u>,
    'strike-through': ({ children }) => <s>{children}</s>,
    // Links: #c44 underlined, hover shifts toward #ff6b6b (site-wide treatment).
    link: ({ children, value }) => {
      const href = (value as { href?: string } | undefined)?.href ?? ''
      if (!href) return <>{children}</>
      // #c44 underlined at rest; hover gains a #64ffda underline accent (keeping
      // the text at #c44 — #ff6b6b as text fails AA contrast on white).
      const className =
        'text-red-dark underline underline-offset-2 hover:decoration-green-light hover:decoration-2'
      if (isInternalHref(href)) {
        return (
          <Link href={href} className={className}>
            {children}
          </Link>
        )
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
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
