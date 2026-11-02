import { formatYear } from '../../i18n/formatYear'
import type { Language } from '../../i18n/LanguageContext'
import type { TrendChartPoint } from './TrendChart'

type DeltaBarChartProps = {
  points: TrendChartPoint[]
  height?: number
  unit?: string
  /** Converts every displayed year (axis labels, tooltips) to Buddhist Era in Thai mode — defaults to English/CE. */
  language?: Language
}

const VIEW_WIDTH = 640
const MARGIN = { top: 16, right: 14, bottom: 22, left: 38 }

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * One bar per year = change vs. the previous year, in percentage points,
 * growing up (green) or down (orange) from a zero line — so the trend
 * chart's shape is backed by the actual year-to-year deltas, not just read
 * off the slope by eye. The first year has no previous value, so it has no
 * bar (matches TrendChart's own "first year of data" treatment).
 */
export function DeltaBarChart({ points, height = 110, unit = 'pp', language = 'en' }: DeltaBarChartProps) {
  const deltas = points.map((point, index) => {
    const prev = index > 0 ? points[index - 1].value : null
    const delta = point.value !== null && prev !== null ? round1(point.value - prev) : null
    return { year: point.year, delta }
  })

  const maxAbsDelta = Math.max(...deltas.map((d) => Math.abs(d.delta ?? 0)), 1)
  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const zeroY = MARGIN.top + plotHeight / 2
  const stepX = deltas.length > 1 ? plotWidth / (deltas.length - 1) : 0
  const barWidth = Math.max(10, stepX * 0.5)

  const xAt = (index: number) => MARGIN.left + index * stepX
  const barHeightFor = (delta: number) => (Math.abs(delta) / maxAbsDelta) * (plotHeight / 2)

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} preserveAspectRatio="none">
      <line x1={MARGIN.left} x2={VIEW_WIDTH - MARGIN.right} y1={zeroY} y2={zeroY} stroke="var(--color-line)" strokeWidth={1} />
      {deltas.map((d, index) => {
        if (d.delta === null) return null
        const isUp = d.delta > 0.05
        const isDown = d.delta < -0.05
        const barH = Math.max(1.5, barHeightFor(d.delta))
        const y = isDown ? zeroY : zeroY - barH
        const color = isUp ? 'var(--color-green-600)' : isDown ? 'var(--color-accent-600)' : 'var(--color-mist-2)'
        const labelY = isDown ? y + barH + 11 : y - 4
        return (
          <g key={d.year}>
            <rect x={xAt(index) - barWidth / 2} y={y} width={barWidth} height={barH} fill={color} rx={2}>
              <title>
                {formatYear(d.year, language)}: {d.delta > 0 ? '+' : ''}
                {d.delta} {unit}
              </title>
            </rect>
            <text x={xAt(index)} y={labelY} textAnchor="middle" fontSize="9" fontWeight={600} fill="var(--color-slate)">
              {d.delta > 0 ? '+' : ''}
              {d.delta}
            </text>
          </g>
        )
      })}
      {deltas.map((d, index) => (
        <text key={d.year} x={xAt(index)} y={height - 6} textAnchor="middle" fontSize="9.5" fill="var(--color-mist)">
          {formatYear(d.year, language)}
        </text>
      ))}
    </svg>
  )
}
