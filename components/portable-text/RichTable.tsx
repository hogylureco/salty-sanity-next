import { SpotPortableText, type PortableTextValue } from './SpotPortableText'

/**
 * Shapes mirror `sanity-plugin-rich-table` (the authoritative source):
 * - `columnHeaders`: the header row (NOT the first data row). `title` per column,
 *   0-based `cellIndex` used to order them.
 * - `rows`: ALL data rows. `title` is the optional row-header label, surfaced only
 *   when `hasRowTitles` is true.
 * - `richTableCell.content`: Portable Text, rendered through the shared map.
 * Everything is optional here so a malformed block degrades instead of throwing.
 */
interface RichTableColumnHeader {
  _key?: string
  title?: string
  cellIndex?: number
  width?: number
}

interface RichTableCellValue {
  _key?: string
  _type?: string
  content?: PortableTextValue
}

interface RichTableRow {
  _key?: string
  _type?: string
  title?: string
  cells?: RichTableCellValue[]
}

export interface RichTableBlockValue {
  _key?: string
  _type?: string
  hasColumnTitles?: boolean
  hasRowTitles?: boolean
  columnHeaders?: RichTableColumnHeader[]
  rows?: RichTableRow[]
}

/** Flatten a cell's Portable Text to plain text (for the numeric-font heuristic). */
function cellPlainText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return content
    .map((block) => {
      const children = (block as { children?: Array<{ text?: string }> })?.children
      return Array.isArray(children)
        ? children.map((child) => child?.text ?? '').join('')
        : ''
    })
    .join(' ')
}

/**
 * Heuristic: does a cell read as data (coords, times, values) vs prose? Drives
 * the Inconsolata (mono) vs IBM Plex Sans (sans) font choice per the brand — a
 * styling decision over already-present content, no data/logic change.
 */
function looksNumeric(text: string): boolean {
  const t = text.trim()
  if (!t || !/\d/.test(t)) return false
  const letters = (t.match(/[a-zA-Z]/g) ?? []).length
  return letters <= 3 || (t.length <= 18 && letters / t.length < 0.4)
}

/**
 * Plugin-faithful serializer for a `richTableBlock`.
 *
 * Header interpretation matches the plugin's own Studio renderer (`Table.tsx`):
 * the header row comes from the separate `columnHeaders` array, ALL `rows` are
 * data rows, `hasColumnTitles` toggles the column header row, and `hasRowTitles`
 * turns each `row.title` into a `<th scope="row">` leading column.
 *
 * Guard rails: never throws on ragged/empty rows — renders what exists and warns
 * with the block `_key`, so one bad table can't take down a whole spot page.
 */
export function RichTable({ value }: { value: RichTableBlockValue | null | undefined }) {
  if (!value) return null

  const rows = value.rows ?? []
  const headers = [...(value.columnHeaders ?? [])].sort(
    (a, b) => (a.cellIndex ?? 0) - (b.cellIndex ?? 0),
  )
  const showColumnHeaders = value.hasColumnTitles !== false && headers.length > 0
  const showRowTitles = value.hasRowTitles === true

  // Report-only: the import claims rectangular grids, but some tables have a
  // column-header count that differs from their row cell counts. Warn (findable)
  // and render what exists rather than assume equal widths.
  if (headers.length > 0) {
    const ragged = rows.some((row) => (row.cells?.length ?? 0) !== headers.length)
    if (ragged) {
      console.warn(
        `[RichTable] ${value._key ?? '(no _key)'}: ragged grid — ${headers.length} column header(s) vs row cell counts [${rows
          .map((row) => row.cells?.length ?? 0)
          .join(', ')}]`,
      )
    }
  }

  const headerCellClass =
    'bg-header px-3 py-2 text-left font-mono text-sm font-semibold text-white'
  // Strip the shared prose margins/measure when Portable Text renders inside a cell.
  const cellBase =
    'border-t border-body px-3 py-2 align-top text-sm [&_p]:my-0 [&_p]:max-w-none'

  return (
    // `relative` hosts the right-edge scroll fade; keep the overflow-x wrapper.
    <div className="relative my-6">
      <div className="overflow-x-auto" style={{ overflowX: 'auto' }}>
        <table className="w-full border-collapse">
          {showColumnHeaders && (
            <thead>
              <tr>
                {showRowTitles && <th scope="col" className={headerCellClass} />}
                {headers.map((header, index) => (
                  <th key={header._key ?? index} scope="col" className={headerCellClass}>
                    {header.title ?? ''}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, rowIndex) => (
              // Zebra striping: #fff / #f9f9f9 alternation.
              <tr key={row._key ?? rowIndex} className="odd:bg-box even:bg-body">
                {showRowTitles && (
                  <th
                    scope="row"
                    className="border-t border-body bg-body px-3 py-2 text-left align-top font-mono text-sm font-semibold text-header"
                  >
                    {row.title ?? ''}
                  </th>
                )}
                {(row.cells ?? []).length === 0 ? (
                  <td className={cellBase} />
                ) : (
                  (row.cells ?? []).map((cell, cellIndex) => (
                    <td
                      key={cell._key ?? cellIndex}
                      // Numeric-looking cells in Inconsolata; text cells in IBM Plex Sans.
                      className={`${cellBase} ${
                        looksNumeric(cellPlainText(cell.content))
                          ? 'font-mono'
                          : 'font-sans'
                      }`}
                    >
                      <SpotPortableText value={cell.content} />
                    </td>
                  ))
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Scroll affordance: a subtle right-edge fade hinting horizontal scroll. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white/90 to-transparent"
      />
    </div>
  )
}
