import { formatPct } from '../../mock/areas'
import { computeCountAxis } from './trendAxis'
import { useChartWidth } from './useChartWidth'

type CoverageStackedBarRow = { id: string; name: string; total_population: number; population_with_access: number }

type CoverageStackedBarProps = {
  rows: CoverageStackedBarRow[]
  selectedId?: string
  coveredLabel: string
  notCoveredLabel: string
  /** Used both as the tooltip's "total" row label and nowhere else — reuses whatever word the page already shows for population elsewhere. */
  populationLabel: string
  height?: number
}

const MARGIN = { top: 20, right: 14, bottom: 34, left: 48 }
// Below this many px per bar, columns start cramming into each other —
// past that point the chart grows wider than its card and scrolls
// horizontally instead, rather than squeezing bars/labels unreadably thin.
const MIN_BAR_STEP = 64

/** "1,200,000" → "1.2M", "450,000" → "450K" — axis labels stay short regardless of the city's real population scale; the hover tooltip still gives the exact figure. */
function formatCompactCount(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000
    return `${millions % 1 === 0 ? millions : Math.round(millions * 10) / 10}M`
  }
  if (value >= 1_000) {
    const thousands = value / 1_000
    return `${thousands % 1 === 0 ? thousands : Math.round(thousands * 10) / 10}K`
  }
  return String(Math.round(value))
}

/** Stacked population bars (covered vs. not covered), one per area — an absolute-numbers counterpart to the ranking chart's percentages, so a small-population area with high access and a large-population area with low access don't look the same. */
export function CoverageStackedBar({ rows, selectedId, coveredLabel, notCoveredLabel, populationLabel, height = 240 }: CoverageStackedBarProps) {
  const { ref, width: availableWidth } = useChartWidth(600)
  const minRequiredWidth = MARGIN.left + MARGIN.right + rows.length * MIN_BAR_STEP
  const width = Math.max(availableWidth, minRequiredWidth)

  const axis = computeCountAxis(rows.map((row) => row.total_population))
  const plotWidth = width - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const stepX = rows.length > 0 ? plotWidth / rows.length : plotWidth
  const barWidth = Math.min(40, stepX * 0.6)

  const xAt = (index: number) => MARGIN.left + index * stepX + stepX / 2
  const yAt = (value: number) => MARGIN.top + plotHeight - (value / axis.max) * plotHeight

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-[12px] text-slate">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: 'var(--color-green-600)' }} />
          {coveredLabel}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: 'var(--color-mist-2)' }} />
          {notCoveredLabel}
        </span>
      </div>

      <div ref={ref} className="w-full min-w-0 overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ fontFamily: 'inherit' }}>
          {axis.ticks.map((tick) => (
            <g key={tick}>
              <line x1={MARGIN.left} x2={width - MARGIN.right} y1={yAt(tick)} y2={yAt(tick)} stroke="var(--color-line)" strokeWidth={1} />
              <text x={MARGIN.left - 6} y={yAt(tick) + 3} textAnchor="end" fontSize="12" fill="var(--color-mist)">
                {formatCompactCount(tick)}
              </text>
            </g>
          ))}

          {rows.map((row, index) => {
            const notCovered = row.total_population - row.population_with_access
            const coveredPctText = row.total_population > 0 ? formatPct((row.population_with_access / row.total_population) * 100) : formatPct(0)
            const x = xAt(index) - barWidth / 2
            const isSelected = row.id === selectedId
            const tooltip = [
              row.name,
              `${coveredLabel}: ${Math.round(row.population_with_access).toLocaleString()} (${coveredPctText})`,
              `${notCoveredLabel}: ${Math.round(notCovered).toLocaleString()}`,
              `${populationLabel}: ${Math.round(row.total_population).toLocaleString()}`,
            ].join('\n')
            return (
              <g key={row.id}>
                {isSelected && (
                  <rect x={xAt(index) - stepX / 2} y={MARGIN.top} width={stepX} height={plotHeight} fill="var(--color-green-50)" />
                )}
                <rect
                  x={x}
                  y={yAt(row.population_with_access)}
                  width={barWidth}
                  height={plotHeight - (yAt(row.population_with_access) - MARGIN.top)}
                  fill="var(--color-green-600)"
                >
                  <title>{tooltip}</title>
                </rect>
                <rect
                  x={x}
                  y={yAt(row.total_population)}
                  width={barWidth}
                  height={yAt(row.population_with_access) - yAt(row.total_population)}
                  fill="var(--color-mist-2)"
                >
                  <title>{tooltip}</title>
                </rect>
                <text x={xAt(index)} y={yAt(row.total_population) - 6} textAnchor="middle" fontSize="12" fontWeight={700} fill="var(--color-ink)">
                  {coveredPctText}
                </text>
                <text
                  x={xAt(index)}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight={isSelected ? 700 : 500}
                  fill="var(--color-mist)"
                >
                  {row.name.length > 14 ? `${row.name.slice(0, 13)}…` : row.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
