import { formatYear } from '../../i18n/formatYear'
import { formatPctChange, roundPct } from '../../mock/areas'
import type { Language } from '../../i18n/LanguageContext'
import type { TrendChartPoint } from './TrendChart'
import { pickLabelIndices } from './trendAxis'
import { useChartWidth } from './useChartWidth'

type DeltaBarChartProps = {
  points: TrendChartPoint[]
  height?: number
  /** Converts every displayed year (axis labels, tooltips) to Buddhist Era in Thai mode, and the delta tooltip's unit ("pp" vs. "จุด") — defaults to English/CE. */
  language?: Language
  /** Display precision of the changes (PCT_DECIMALS) — 2 for share of OPS, 1 otherwise. */
  decimals?: number
}

const MARGIN = { top: 18, right: 14, bottom: 22, left: 40 }

/**
 * One bar per year = change vs. the previous year, in percentage points,
 * growing up (green) or down (orange) from a zero line — so the trend
 * chart's shape is backed by the actual year-to-year deltas, not just read
 * off the slope by eye. The first year has no previous value, so it has no
 * bar (matches TrendChart's own "first year of data" treatment).
 */
export function DeltaBarChart({ points, height = 110, language = 'en', decimals = 1 }: DeltaBarChartProps) {
  const unit = language === 'th' ? 'จุด' : 'pp'
  const { ref, width } = useChartWidth(600)
  const deltas = points.map((point, index) => {
    const prev = index > 0 ? points[index - 1].value : null
    const delta = point.value !== null && prev !== null ? roundPct(point.value - prev, decimals) : null
    return { year: point.year, delta }
  })

  // Scale floor follows the precision (1 pp at 1 decimal, 0.1 pp at 2), so
  // small-valued indicators like share of OPS still get readable bars.
  const maxAbsDelta = Math.max(...deltas.map((d) => Math.abs(d.delta ?? 0)), 10 ** (1 - decimals))
  const plotWidth = width - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const zeroY = MARGIN.top + plotHeight / 2
  const stepX = deltas.length > 1 ? plotWidth / (deltas.length - 1) : 0
  const barWidth = Math.max(10, stepX * 0.5)

  const xAt = (index: number) => MARGIN.left + index * stepX
  const barHeightFor = (delta: number) => (Math.abs(delta) / maxAbsDelta) * (plotHeight / 2)
  const labeledYearIndices = new Set(pickLabelIndices(deltas.length, plotWidth))

  return (
    <div ref={ref} className="w-full min-w-0">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ fontFamily: 'inherit' }}>
        <line x1={MARGIN.left} x2={width - MARGIN.right} y1={zeroY} y2={zeroY} stroke="var(--color-line)" strokeWidth={1} />
        {deltas.map((d, index) => {
          if (d.delta === null) return null
          const isUp = d.delta > 0.05
          const isDown = d.delta < -0.05
          const barH = Math.max(1.5, barHeightFor(d.delta))
          const y = isDown ? zeroY : zeroY - barH
          const color = isUp ? 'var(--color-green-600)' : isDown ? 'var(--color-accent-600)' : 'var(--color-mist-2)'
          const labelY = isDown ? y + barH + 13 : y - 5
          return (
            <g key={d.year}>
              <rect x={xAt(index) - barWidth / 2} y={y} width={barWidth} height={barH} fill={color} rx={2}>
                <title>
                  {formatYear(d.year, language)}: {formatPctChange(d.delta, decimals)} {unit}
                </title>
              </rect>
              <text x={xAt(index)} y={labelY} textAnchor="middle" fontSize="12" fontWeight={600} fill="var(--color-slate)">
                {formatPctChange(d.delta, decimals)}
              </text>
            </g>
          )
        })}
        {deltas.map((d, index) => {
          if (!labeledYearIndices.has(index)) return null
          return (
            <text key={d.year} x={xAt(index)} y={height - 6} textAnchor="middle" fontSize="12" fill="var(--color-mist)">
              {formatYear(d.year, language)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
