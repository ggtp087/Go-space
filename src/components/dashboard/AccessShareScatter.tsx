import { roundPct } from '../../mock/areas'

type AccessShareScatterRow = { id: string; name: string; access_pct: number; share_ops_pct: number; total_population: number }

type AccessShareScatterProps = {
  rows: AccessShareScatterRow[]
  /** Ids currently shown by the control bar — get full opacity; everything else dims. Undefined (or containing every row) highlights all. */
  highlightIds?: Set<string>
  selectedId?: string
  quadrantLabels: { highHigh: string; highLow: string; lowHigh: string; lowLow: string }
  axisLabels: { x: string; y: string }
  populationLabel: string
  height?: number
}

const VIEW_WIDTH = 640
const MARGIN = { top: 20, right: 20, bottom: 40, left: 46 }
const MIN_RADIUS = 4
const MAX_RADIUS = 18

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
export function AccessShareScatter({ rows, highlightIds, selectedId, quadrantLabels, axisLabels, populationLabel, height = 320 }: AccessShareScatterProps) {
  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const xAt = (value: number) => MARGIN.left + (value / 100) * plotWidth
  const yAt = (value: number) => MARGIN.top + plotHeight - (value / 100) * plotHeight

  const medianX = rows.length ? median(rows.map((r) => r.share_ops_pct)) : 50
  const medianY = rows.length ? median(rows.map((r) => r.access_pct)) : 50
  const maxPopulation = Math.max(...rows.map((r) => r.total_population), 1)
  const radiusFor = (population: number) => MIN_RADIUS + Math.sqrt(Math.max(population, 0) / maxPopulation) * (MAX_RADIUS - MIN_RADIUS)

  const ticks = [0, 25, 50, 75, 100]

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} preserveAspectRatio="none">
      {ticks.map((tick) => (
        <g key={`x${tick}`}>
          <line x1={xAt(tick)} x2={xAt(tick)} y1={MARGIN.top} y2={height - MARGIN.bottom} stroke="var(--color-line)" strokeWidth={1} />
          <text x={xAt(tick)} y={height - MARGIN.bottom + 16} textAnchor="middle" fontSize="9.5" fill="var(--color-mist)">
            {tick}
          </text>
        </g>
      ))}
      {ticks.map((tick) => (
        <g key={`y${tick}`}>
          <line x1={MARGIN.left} x2={VIEW_WIDTH - MARGIN.right} y1={yAt(tick)} y2={yAt(tick)} stroke="var(--color-line)" strokeWidth={1} />
          <text x={MARGIN.left - 6} y={yAt(tick) + 3} textAnchor="end" fontSize="9.5" fill="var(--color-mist)">
            {tick}
          </text>
        </g>
      ))}

      <text x={(MARGIN.left + VIEW_WIDTH - MARGIN.right) / 2} y={height - 4} textAnchor="middle" fontSize="10.5" fontWeight={600} fill="var(--color-slate)">
        {axisLabels.x}
      </text>
      <text
        x={12}
        y={(MARGIN.top + height - MARGIN.bottom) / 2}
        textAnchor="middle"
        fontSize="10.5"
        fontWeight={600}
        fill="var(--color-slate)"
        transform={`rotate(-90, 12, ${(MARGIN.top + height - MARGIN.bottom) / 2})`}
      >
        {axisLabels.y}
      </text>

      <line x1={xAt(medianX)} x2={xAt(medianX)} y1={MARGIN.top} y2={height - MARGIN.bottom} stroke="var(--color-mist-2)" strokeWidth={1.5} strokeDasharray="4 3" />
      <line x1={MARGIN.left} x2={VIEW_WIDTH - MARGIN.right} y1={yAt(medianY)} y2={yAt(medianY)} stroke="var(--color-mist-2)" strokeWidth={1.5} strokeDasharray="4 3" />

      {/* Anchored to the plot's own corners (not the median lines) so a
          median sitting near one edge never crowds two labels together. */}
      <text x={VIEW_WIDTH - MARGIN.right - 5} y={MARGIN.top + 11} textAnchor="end" fontSize="9.5" fontStyle="italic" fill="var(--color-mist)">
        {quadrantLabels.highHigh}
      </text>
      <text x={MARGIN.left + 5} y={MARGIN.top + 11} textAnchor="start" fontSize="9.5" fontStyle="italic" fill="var(--color-mist)">
        {quadrantLabels.lowHigh}
      </text>
      <text x={VIEW_WIDTH - MARGIN.right - 5} y={height - MARGIN.bottom - 6} textAnchor="end" fontSize="9.5" fontStyle="italic" fill="var(--color-mist)">
        {quadrantLabels.highLow}
      </text>
      <text x={MARGIN.left + 5} y={height - MARGIN.bottom - 6} textAnchor="start" fontSize="9.5" fontStyle="italic" fill="var(--color-mist)">
        {quadrantLabels.lowLow}
      </text>

      {rows.map((row) => {
        const isHighlighted = !highlightIds || highlightIds.has(row.id)
        const isSelected = row.id === selectedId
        return (
          <circle
            key={row.id}
            cx={xAt(row.share_ops_pct)}
            cy={yAt(row.access_pct)}
            r={radiusFor(row.total_population)}
            fill="var(--color-green-600)"
            fillOpacity={isSelected ? 0.9 : isHighlighted ? 0.55 : 0.12}
            stroke={isSelected ? 'var(--color-ink)' : 'var(--color-green-700)'}
            strokeWidth={isSelected ? 2 : 1}
            strokeOpacity={isSelected ? 1 : isHighlighted ? 0.7 : 0.15}
          >
            <title>
              {row.name}: {axisLabels.x} {roundPct(row.share_ops_pct)}%, {axisLabels.y} {roundPct(row.access_pct)}%, {populationLabel}{' '}
              {Math.round(row.total_population).toLocaleString()}
            </title>
          </circle>
        )
      })}
    </svg>
  )
}
