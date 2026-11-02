import { computeCountAxis } from './trendAxis'

type CoverageStackedBarRow = { id: string; name: string; total_population: number; population_with_access: number }

type CoverageStackedBarProps = {
  rows: CoverageStackedBarRow[]
  selectedId?: string
  coveredLabel: string
  notCoveredLabel: string
  height?: number
}

const VIEW_WIDTH = 640
const MARGIN = { top: 26, right: 14, bottom: 34, left: 48 }

/** Stacked population bars (covered vs. not covered), one per area — an absolute-numbers counterpart to the ranking chart's percentages, so a small-population area with high access and a large-population area with low access don't look the same. */
export function CoverageStackedBar({ rows, selectedId, coveredLabel, notCoveredLabel, height = 220 }: CoverageStackedBarProps) {
  const axis = computeCountAxis(rows.map((row) => row.total_population))
  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const stepX = rows.length > 0 ? plotWidth / rows.length : plotWidth
  const barWidth = Math.min(40, stepX * 0.6)

  const xAt = (index: number) => MARGIN.left + index * stepX + stepX / 2
  const yAt = (value: number) => MARGIN.top + plotHeight - (value / axis.max) * plotHeight

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} preserveAspectRatio="none">
      <g className="mb-1">
        <rect x={MARGIN.left} y={MARGIN.top - 18} width={11} height={11} fill="var(--color-green-600)" rx={2} />
        <text x={MARGIN.left + 15} y={MARGIN.top - 9} fontSize="10.5" fill="var(--color-slate)">
          {coveredLabel}
        </text>
        <rect x={MARGIN.left + 15 + coveredLabel.length * 5.6 + 14} y={MARGIN.top - 18} width={11} height={11} fill="var(--color-mist-2)" rx={2} />
        <text x={MARGIN.left + 15 + coveredLabel.length * 5.6 + 29} y={MARGIN.top - 9} fontSize="10.5" fill="var(--color-slate)">
          {notCoveredLabel}
        </text>
      </g>

      {axis.ticks.map((tick) => (
        <g key={tick}>
          <line x1={MARGIN.left} x2={VIEW_WIDTH - MARGIN.right} y1={yAt(tick)} y2={yAt(tick)} stroke="var(--color-line)" strokeWidth={1} />
          <text x={MARGIN.left - 6} y={yAt(tick) + 3} textAnchor="end" fontSize="9.5" fill="var(--color-mist)">
            {Math.round(tick).toLocaleString()}
          </text>
        </g>
      ))}

      {rows.map((row, index) => {
        const notCovered = row.total_population - row.population_with_access
        const coveredPct = row.total_population > 0 ? Math.round((row.population_with_access / row.total_population) * 100) : 0
        const x = xAt(index) - barWidth / 2
        const isSelected = row.id === selectedId
        return (
          <g key={row.id}>
            {isSelected && (
              <rect x={xAt(index) - stepX / 2} y={MARGIN.top} width={stepX} height={plotHeight} fill="var(--color-green-50)" />
            )}
            <rect x={x} y={yAt(row.population_with_access)} width={barWidth} height={plotHeight - (yAt(row.population_with_access) - MARGIN.top)} fill="var(--color-green-600)">
              <title>
                {row.name} — {coveredLabel}: {Math.round(row.population_with_access).toLocaleString()}
              </title>
            </rect>
            <rect x={x} y={yAt(row.total_population)} width={barWidth} height={yAt(row.population_with_access) - yAt(row.total_population)} fill="var(--color-mist-2)">
              <title>
                {row.name} — {notCoveredLabel}: {Math.round(notCovered).toLocaleString()}
              </title>
            </rect>
            <text x={xAt(index)} y={yAt(row.total_population) - 6} textAnchor="middle" fontSize="9.5" fontWeight={700} fill="var(--color-ink)">
              {coveredPct}%
            </text>
            <text
              x={xAt(index)}
              y={height - 6}
              textAnchor="middle"
              fontSize="9.5"
              fontWeight={isSelected ? 700 : 500}
              fill="var(--color-mist)"
            >
              {row.name.length > 14 ? `${row.name.slice(0, 13)}…` : row.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
