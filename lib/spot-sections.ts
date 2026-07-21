/**
 * Shared model for the spot page's section registry. The page builds ONE array
 * of section descriptors and renders both the sticky TOC and the center-column
 * Boxes from it, so the two can never drift (Step 1 of the redesign brief).
 *
 * These helpers are pure so they run on the server (registry + TOC data) AND are
 * imported by the Portable Text map, which stamps the SAME slug onto rendered
 * headings — that's what makes in-page anchor links line up with TOC sub-entries.
 */

/** A single Portable Text block (only the parts we read here). */
interface PtBlock {
  _type?: string
  _key?: string
  style?: string
  children?: Array<{ _type?: string; text?: string }>
}

/** Plain text of a block: concatenate its span children. */
export function blockPlainText(block: unknown): string {
  const b = block as PtBlock | null | undefined
  if (!b || !Array.isArray(b.children)) return ''
  return b.children
    .map((c) => (typeof c?.text === 'string' ? c.text : ''))
    .join('')
    .trim()
}

/**
 * Deterministic anchor id from heading text. Runs identically wherever it's
 * called (TOC build + heading render) so the fragment ids match. Prefixed to
 * avoid colliding with the fixed section ids.
 */
export function slugifyHeading(text: string): string {
  const base = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
    .replace(/^-+|-+$/g, '')
  return `h-${base || 'section'}`
}

export interface Heading {
  id: string
  title: string
}

/**
 * Extract headings of the given styles from a Portable Text value, in order.
 * Used to generate indented TOC sub-entries FROM the rendered content (not a
 * hardcoded list). Capped so a long field doesn't flood the rail.
 */
export function headingsOf(
  value: unknown,
  styles: string[] = ['h2'],
  max = 8,
): Heading[] {
  if (!Array.isArray(value)) return []
  const out: Heading[] = []
  const seen = new Set<string>()
  for (const block of value as PtBlock[]) {
    if (block?._type !== 'block') continue
    if (!block.style || !styles.includes(block.style)) continue
    const text = blockPlainText(block)
    if (!text) continue
    const id = slugifyHeading(text)
    // Two headings with the same text slugify to the same anchor id; keep the
    // first (matches the first rendered heading) so TOC keys/entries stay unique.
    if (seen.has(id)) continue
    seen.add(id)
    out.push({ id, title: text })
    if (out.length >= max) break
  }
  return out
}

/** True when a Portable Text field actually has renderable content. */
export function hasPortableText(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0
}

// --- Serializable shapes handed to the client TOC / tab bar --------------------

export interface TocEntry {
  id: string
  title: string
  hasContent: boolean
  subs: Heading[]
}

export interface TabItem {
  /** Anchor target — the section's DOM id. */
  sectionId: string
  label: string
}
