import { formatPct, roundPct } from '../../mock/areas'
import { computeTrendYAxis } from './trendAxis'
import { useChartWidth } from './useChartWidth'

type AccessShareScatterRow = { id: string; name: string; access_pct: number; share_ops_pct: number; total_population: number }

type AccessShareScatterProps = {
  rows: AccessShareScatterRow[]
  /** Ids currently shown by the control bar — get full opacity; everything else dims. Undefined (or containing every row) highlights all. */
  highlightIds?: Set<string>
  selectedId?: string
  quadrantLabels: { highHigh: string; highLow: string; lowHigh: string; lowLow: string }
  axisLabels: { x: string; y: string }
  populationLabel: string
  /** Contains a "{value}" placeholder, e.g. "median {value}%". */
  medianLabelTemplate: string
  /** Shown below the chart when either axis is zoomed in (doesn't start at 0) — these are scatter axes, so unlike bar/line charts that always get zeroed, they zoom to the data on purpose. */
  axisNote?: string
  height?: number
}

const MARGIN = { top: 28, right: 20, bottom: 40, left: 46 }
const MIN_RADIUS = 6
const MAX_RADIUS = 18
// Past this many points, per-dot name labels turn into visual noise — the
// hover tooltip still gives every area's exact name and numbers.
const MAX_LABELED_POINTS = 15

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

/**
 * Scatter of open-space share vs. accessibility, one dot per area, sized by
 * population (area, not radius, roughly proportional — the standard bubble
 * convention) — split into 4 quadrants by the median of each axis, so "more
 * open space but still low access" areas (the actionable gap) stand out.
 * Always plots every row in the current district/sub-district scope; the
 * control bar only changes which dots are highlighted vs. dimmed.
 */
export function AccessShareScatter({
  rows,
  highlightIds,
  selectedId,
  quadrantLabels,
  axisLabels,
  populationLabel,
  medianLabelTemplate,
  axisNote,
  height = 320,
}: AccessShareScatterProps) {
  const { ref, width } = useChartWidth(600)
  const plotWidth = width - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom

  // Zoomed to the data's own range (with padding), not a fixed 0–100 — a
  // scatter's axes don't need to start at 0 the way a bar chart's does.
  const xAxis = computeTrendYAxis(rows.map((r) => r.share_ops_pct))
  const yAxis = computeTrendYAxis(rows.map((r) => r.access_pct))
  const xAt = (value: number) => MARGIN.left + ((value - xAxis.min) / Math.max(xAxis.max - xAxis.min, 0.001)) * plotWidth
  const yAt = (value: number) => MARGIN.top + plotHeight - ((value - yAxis.min) / Math.max(yAxis.max - yAxis.min, 0.001)) * plotHeight

  const medianX = rows.length ? median(rows.map((r) => r.share_ops_pct)) : 50
  const medianY = rows.length ? median(rows.map((r) => r.access_pct)) : 50
  const maxPopulation = Math.max(...rows.map((r) => r.total_population), 1)
  const radiusFor = (population: number) => MIN_RADIUS + Math.sqrt(Math.max(population, 0) / maxPopulation) * (MAX_RADIUS - MIN_RADIUS)

  const showPointLabels = rows.length > 0 && rows.length <= MAX_LABELED_POINTS
  const showAxisNote = axisNote && (xAxis.min > 0 || yAxis.min > 0)

  // Quadrant labels sit at the horizontal midpoint between the median line
  // and the plot's own edge (not the fixed corner, and not hugging the
  // median line itself — that overlapped when the median sat near an edge).
  const xMidLeft = (MARGIN.left + xAt(medianX)) / 2
  const xMidRight = (xAt(medianX) + (width - MARGIN.right)) / 2
  const yTop = MARGIN.top + 14
  const yBottom = height - MARGIN.bottom - 8

  return (
    <div>
      <div ref={ref} className="w-full min-w-0">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ fontFamily: 'inherit' }}>
          {xAxis.ticks.map((tick) => (
            <g key={`x${tick}`}>
              <line x1={xAt(tick)} x2={xAt(tick)} y1={MARGIN.top} y2={height - MARGIN.bottom} stroke="var(--color-line)" strokeWidth={1} />
              <text x={xAt(tick)} y={height - MARGIN.bottom + 16} textAnchor="middle" fontSize="12" fill="var(--color-mist)">
                {tick}
              </text>
            </g>
          ))}
          {yAxis.ticks.map((tick) => (
            <g key={`y${tick}`}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={yAt(tick)} y2={yAt(tick)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={MARGIN.left - 6} y={yAt(tick) + 3} textAnchor="end" fontSize="12" fill="var(--color-mist)">
                {tick}
              </text>
            </g>
          ))}

          <text x={(MARGIN.left + width - MARGIN.right) / 2} y={height - 4} textAnchor="middle" fontSize="12" fontWeight={600} fill="var(--color-slate)">
            {axisLabels.x}
          </text>
          <text
            x={12}
            y={(MARGIN.top + height - MARGIN.bottom) / 2}
            textAnchor="middle"
            fontSize="12"
            fontWeight={600}
            fill="var(--color-slate)"
            transform={`rotate(-90, 12, ${(MARGIN.top + height - MARGIN.bottom) / 2})`}
          >
            {axisLabels.y}
          </text>

          <line x1={xAt(medianX)} x2={xAt(medianX)} y1={MARGIN.top} y2={height - MARGIN.bottom} stroke="var(--color-mist-2)" strokeWidth={1.5} strokeDasharray="4 3" />
          <line x1={MARGIN.left} x2={width - MARGIN.right} y1={yAt(medianY)} y2={yAt(medianY)} stroke="var(--color-mist-2)" strokeWidth={1.5} strokeDasharray="4 3" />

          {rows.map((row) => {
            const isHighlighted = !highlightIds || highlightIds.has(row.id)
            const isSelected = row.id === selectedId
            const cx = xAt(row.share_ops_pct)
            const cy = yAt(row.access_pct)
            const r = radiusFor(row.total_population)
            return (
              <g key={row.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="var(--color-green-600)"
                  fillOpacity={isSelected ? 0.85 : isHighlighted ? 0.5 : 0.12}
                  stroke={isSelected ? 'var(--color-ink)' : 'var(--color-green-700)'}
                  strokeWidth={isSelected ? 2 : 1}
                  strokeOpacity={isSelected ? 1 : isHighlighted ? 0.6 : 0.15}
                >
                  <title>
                    {row.name}: {axisLabels.x} {formatPct(row.share_ops_pct)}, {axisLabels.y} {formatPct(row.access_pct)}, {populationLabel}{' '}
                    {Math.round(row.total_population).toLocaleString()}
                  </title>
                </circle>
                {showPointLabels && isHighlighted && (
                  <text x={cx + r + 4} y={cy + 3} fontSize="10" fill="var(--color-slate)" opacity={isSelected ? 1 : 0.8}>
                    {row.name.length > 16 ? `${row.name.slice(0, 15)}…` : row.name}
                  </text>
                )}
              </g>
            )
          })}

          {/* Drawn last (on top of every bubble) with a card-colored halo
              stroke behind the fill, so a point that happens to land under
              a median or quadrant label never makes it unreadable. */}
          <text
            x={xAt(medianX)}
            y={MARGIN.top - 8}
            textAnchor="middle"
            fontSize="11"
            fill="var(--color-mist)"
            stroke="var(--color-card)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {medianLabelTemplate.replace('{value}', roundPct(medianX).toFixed(1))}
          </text>
          <text
            x={width - MARGIN.right - 4}
            y={yAt(medianY) - 5}
            textAnchor="end"
            fontSize="11"
            fill="var(--color-mist)"
            stroke="var(--color-card)"
            strokeWidth={3}
            paintOrder="stroke"
          >
            {medianLabelTemplate.replace('{value}', roundPct(medianY).toFixed(1))}
          </text>

          <text x={xMidRight} y={yTop} textAnchor="middle" fontSize="11" fill="var(--color-mist)" stroke="var(--color-card)" strokeWidth={3} paintOrder="stroke">
            {quadrantLabels.highHigh}
          </text>
          <text x={xMidLeft} y={yTop} textAnchor="middle" fontSize="11" fill="var(--color-mist)" stroke="var(--color-card)" strokeWidth={3} paintOrder="stroke">
            {quadrantLabels.lowHigh}
          </text>
          <text x={xMidRight} y={yBottom} textAnchor="middle" fontSize="11" fill="var(--color-mist)" stroke="var(--color-card)" strokeWidth={3} paintOrder="stroke">
            {quadrantLabels.highLow}
          </text>
          <text x={xMidLeft} y={yBottom} textAnchor="middle" fontSize="11" fill="var(--color-mist)" stroke="var(--color-card)" strokeWidth={3} paintOrder="stroke">
            {quadrantLabels.lowLow}
          </text>
        </svg>
      </div>
      {showAxisNote && <p className="mt-1 text-[10px] text-mist">{axisNote}</p>}
    </div>
  )
}
