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

  return (
    // Horizontal scroll for wide canal tables; real responsive treatment is Phase 8.
    <div style={{ overflowX: 'auto' }}>
      <table>
        {showColumnHeaders && (
          <thead>
            <tr>
              {showRowTitles && <th scope="col" />}
              {headers.map((header, index) => (
                <th key={header._key ?? index} scope="col">
                  {header.title ?? ''}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, rowIndex) => {
            const cells = row.cells ?? []
            return (
              <tr key={row._key ?? rowIndex}>
                {showRowTitles && <th scope="row">{row.title ?? ''}</th>}
                {cells.length === 0 ? (
                  // Missing/empty cells → a single empty <td>, never a crash.
                  <td />
                ) : (
                  cells.map((cell, cellIndex) => (
                    <td key={cell._key ?? cellIndex}>
                      <SpotPortableText value={cell.content} />
                    </td>
                  ))
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
