import { useChartWidth } from './useChartWidth'

type RankingBarChartRow = { id: string; name: string; value: number }

type RankingBarChartProps = {
  rows: RankingBarChartRow[]
  selectedId?: string
  rowHeight?: number
  axisMax: number
  axisTicks: number[]
  /** Formats a value for the bar's end label and its tooltip — e.g. "79.0%" or "123,456". */
  formatValue: (value: number) => string
  /** Per-bar fill color — accessibilityColor(value) for the accessibility metric, a fixed neutral color for every other metric (so color never implies an accessibility read on a population bar). */
  barColor: (value: number) => string
  /** The current scope's own overall value for this metric (roll-up for %, average-per-area for counts) — drawn as a dashed reference line so individual bars read against it. */
  referenceValue?: number
  /** e.g. "Bangkok 54.6%" or "Average per district 45,210" — shown above the reference line. */
  referenceLabel?: string
}

const BASE_MARGIN = { top: 4, right: 56, bottom: 24 }
const MIN_LEFT_MARGIN = 90
// Rough bold-sans glyph width at the row label's 12px font — generous on
// purpose so a long name gets room rather than ever being clipped or
// truncated.
const CHAR_WIDTH_PX = 7.2
// Below this plot width, 5 ticks (0/25/50/75/100) start crowding into each
// other — thin down to just the first, middle, and last instead.
const CROWDED_PLOT_WIDTH = 260

/**
 * Horizontal ranking bars, one per area, for whichever metric the Dashboard
 * control bar currently has selected — colored on the accessibility scale
 * only when that's the metric being shown; every other metric uses one
 * fixed neutral color, so a glance at bar color never misreads a population
 * ranking as an accessibility one. Axis always starts at 0 (never auto-
 * zoomed) since these are bars — a bar's length itself conveys the value.
 * Row labels are never truncated: the left margin grows to fit the longest
 * name actually in `rows`, and the chart scrolls horizontally rather than
 * clipping if that pushes it past the available width.
 */
export function RankingBarChart({ rows, selectedId, rowHeight = 28, axisMax, axisTicks, formatValue, barColor, referenceValue, referenceLabel }: RankingBarChartProps) {
  const longestName = rows.reduce((max, row) => Math.max(max, row.name.length), 0)
  const left = Math.max(MIN_LEFT_MARGIN, Math.round(longestName * CHAR_WIDTH_PX) + 16)
  // A plain top margin only leaves room for the axis; the reference line's
  // own label needs real space above the bars, or it would overlap the
  // first row.
  const MARGIN = { ...BASE_MARGIN, left, top: referenceValue !== undefined ? 20 : BASE_MARGIN.top }

  const minRequiredWidth = MARGIN.left + MARGIN.right + 220
  const { ref, width: availableWidth } = useChartWidth(600)
  const width = Math.max(availableWidth, minRequiredWidth)
  const plotWidth = width - MARGIN.left - MARGIN.right
  const height = MARGIN.top + MARGIN.bottom + rows.length * rowHeight
  const xAt = (value: number) => MARGIN.left + (value / axisMax) * plotWidth

  const displayedTicks = plotWidth < CROWDED_PLOT_WIDTH && axisTicks.length > 3 ? [axisTicks[0], axisTicks[Math.floor((axisTicks.length - 1) / 2)], axisTicks[axisTicks.length - 1]] : axisTicks

  return (
    <div ref={ref} className="w-full min-w-0 overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ fontFamily: 'inherit' }}>
        {displayedTicks.map((tick) => (
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
              {isSelected && <rect x={0} y={y} width={width} height={rowHeight} fill="var(--color-green-50)" />}
              <text
                x={MARGIN.left - 8}
                y={y + rowHeight / 2 + 4}
                textAnchor="end"
                fontSize="12"
                fontWeight={isSelected ? 700 : 500}
                fill="var(--color-ink)"
              >
                {row.name}
              </text>
              <rect
                x={MARGIN.left}
                y={barY}
                width={Math.max(1, xAt(row.value) - MARGIN.left)}
                height={barH}
                fill={barColor(row.value)}
                rx={3}
              >
                <title>
                  {row.name}: {formatValue(row.value)}
                </title>
              </rect>
              <text x={xAt(row.value) + 6} y={y + rowHeight / 2 + 4} fontSize="12.5" fontWeight={700} fill="var(--color-ink)">
                {formatValue(row.value)}
              </text>
            </g>
          )
        })}
        {displayedTicks.map((tick) => (
          <text key={tick} x={xAt(tick)} y={height - 6} textAnchor="middle" fontSize="12" fill="var(--color-mist)">
            {tick.toLocaleString()}
          </text>
        ))}
        {referenceValue !== undefined &&
          (() => {
            const x = xAt(referenceValue)
            const anchor = x > MARGIN.left + plotWidth * 0.8 ? 'end' : x < MARGIN.left + plotWidth * 0.2 ? 'start' : 'middle'
            return (
              <g>
                <line x1={x} x2={x} y1={MARGIN.top} y2={height - MARGIN.bottom} stroke="var(--color-ink)" strokeWidth={1.5} strokeDasharray="4 3" />
                {referenceLabel && (
                  <text x={x} y={MARGIN.top - 6} textAnchor={anchor} fontSize="11" fontWeight={700} fill="var(--color-ink)">
                    {referenceLabel}
                  </text>
                )}
              </g>
            )
          })()}
      </svg>
    </div>
  )
}
