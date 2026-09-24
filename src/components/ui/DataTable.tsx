import { useMemo, useState, type ReactNode } from 'react'

export type DataTableColumn<T> = {
  key: string
  header: string
  sortable?: boolean
  align?: 'left' | 'right'
  render?: (row: T) => ReactNode
  /** Value to sort by; defaults to reading `row[key]`. */
  sortValue?: (row: T) => string | number
}

type SortDirection = 'asc' | 'desc'

type DataTableProps<T> = {
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string | number
  defaultSortKey?: string
  defaultSortDir?: SortDirection
  footer?: ReactNode
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  getRowId,
  defaultSortKey,
  defaultSortDir = 'desc',
  footer,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState(defaultSortKey)
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDir)

  const sortedRows = useMemo(() => {
    const column = columns.find((c) => c.key === sortKey)
    if (!column) return rows
    const getValue = column.sortValue ?? ((row: T) => row[column.key] as string | number)
    const sorted = [...rows].sort((a, b) => {
      const av = getValue(a)
      const bv = getValue(b)
      return typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))
    })
    return sortDir === 'desc' ? sorted.reverse() : sorted
  }, [rows, sortKey, sortDir, columns])

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`border-b border-line px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[.4px] text-mist ${
                    column.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {column.sortable ? (
                    <button
                      type="button"
                      onClick={() => handleSort(column.key)}
                      className={`inline-flex items-center gap-1 border-none bg-transparent p-0 text-[11px] font-bold uppercase tracking-[.4px] ${
                        sortKey === column.key ? 'text-green-700' : 'text-mist'
                      }`}
                    >
                      {column.header}
                      <SortIcon direction={sortKey === column.key ? sortDir : undefined} />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={getRowId(row)}>
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`border-b border-line px-3.5 py-[11px] text-[13px] text-ink ${
                      column.align === 'right' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {column.render ? column.render(row) : String(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {footer && <div className="flex items-center justify-between pt-3.5 text-xs text-slate">{footer}</div>}
    </div>
  )
}

function SortIcon({ direction }: { direction?: SortDirection }) {
  if (!direction) {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
        <polyline points="7 9 10 6 13 9" />
        <polyline points="7 15 10 18 13 15" />
      </svg>
    )
  }
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      className={direction === 'asc' ? 'rotate-180' : ''}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}
