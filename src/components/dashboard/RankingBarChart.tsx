import { accessibilityColor, roundPct } from '../../mock/areas'

type RankingBarChartRow = { id: string; name: string; access_pct: number }

type RankingBarChartProps = {
  rows: RankingBarChartRow[]
  selectedId?: string
  rowHeight?: number
}

const VIEW_WIDTH = 640
const MARGIN = { top: 4, right: 44, bottom: 20, left: 130 }
const AXIS_MAX = 100
const AXIS_TICKS = [0, 25, 50, 75, 100]

/**
 * Horizontal ranking bars, one per area, colored on the same 5-step scale
 * as the map/choropleth so a glance here matches a glance there. Axis is
 * fixed at 0–100 (never auto-zoomed) since these are bars, not a line —
 * a bar's length itself conveys the value, so it must start at 0.
 */
export function RankingBarChart({ rows, selectedId, rowHeight = 26 }: RankingBarChartProps) {
  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right
  const height = MARGIN.top + MARGIN.bottom + rows.length * rowHeight
  const xAt = (value: number) => MARGIN.left + (value / AXIS_MAX) * plotWidth

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} preserveAspectRatio="none">
      {AXIS_TICKS.map((tick) => (
        <line
          key={tick}
          x1={xAt(tick)}
          x2={xAt(tick)}
          y1={MARGIN.top}
          y2={height - MARGIN.bottom}
          stroke="var(--color-line)"
          strokeWidth={1}
        />
      ))}
      {rows.map((row, index) => {
        const y = MARGIN.top + index * rowHeight
        const barY = y + rowHeight * 0.22
        const barH = rowHeight * 0.56
        const isSelected = row.id === selectedId
        return (
          <g key={row.id}>
            {isSelected && <rect x={0} y={y} width={VIEW_WIDTH} height={rowHeight} fill="var(--color-green-50)" />}
            <text x={MARGIN.left - 8} y={y + rowHeight / 2 + 3.5} textAnchor="end" fontSize="11" fontWeight={isSelected ? 700 : 500} fill="var(--color-ink)">
              {row.name.length > 20 ? `${row.name.slice(0, 19)}…` : row.name}
            </text>
            <rect x={MARGIN.left} y={barY} width={Math.max(1, xAt(row.access_pct) - MARGIN.left)} height={barH} fill={accessibilityColor(row.access_pct)} rx={3}>
              <title>
                {row.name}: {roundPct(row.access_pct)}%
              </title>
            </rect>
            <text x={xAt(row.access_pct) + 6} y={y + rowHeight / 2 + 3.5} fontSize="11" fontWeight={700} fill="var(--color-ink)">
              {roundPct(row.access_pct)}%
            </text>
          </g>
        )
      })}
      {AXIS_TICKS.map((tick) => (
        <text key={tick} x={xAt(tick)} y={height - 6} textAnchor="middle" fontSize="9.5" fill="var(--color-mist)">
          {tick}
        </text>
      ))}
    </svg>
  )
}
