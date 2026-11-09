import { useState } from 'react'
import { formatYear } from '../../i18n/formatYear'
import type { Language } from '../../i18n/LanguageContext'
import type { Strings } from '../../i18n/strings'
import { formatPct } from '../../mock/areas'
import type { Year } from '../../mock/years'
import { computeSignedAxis, computeTrendYAxis, pickLabelIndices } from './trendAxis'
import { useChartWidth } from './useChartWidth'

export type ComparisonTrendPoint = { year: Year; value: number | null }
export type ComparisonTrendSeries = { id: string; label: string; color: string; points: ComparisonTrendPoint[] }

type ComparisonTrendChartProps = {
  series: ComparisonTrendSeries[]
  /** 'actual': each line plots its own raw value. 'change': every line is re-based to 0 at its first year, plotting the running change since then. */
  mode: 'actual' | 'change'
  /** The globally selected year (Comparison's "Year shown" picker) — gets its own dashed guide line, and is what the right-edge end labels report. */
  selectedYear: Year
  language: Language
  t: Strings
  height?: number
}

const MARGIN = { top: 16, right: 132, bottom: 24, left: 40 }
const END_LABEL_MIN_GAP = 15

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

/** "+4.2 pp" / "−1.0 pp" / "0.0 pp" — change mode's own value format (formatPct's "%" suffix doesn't apply to a signed point difference). */
function formatChange(value: number, pointsUnit: string): string {
  const rounded = round1(value)
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return `${sign}${Math.abs(rounded).toFixed(1)} ${pointsUnit}`
}

/** Greedy vertical de-collision — sorted ascending, each label pushed down just enough to clear the one above it. Good enough for the handful of end labels (≤5 compared areas) or hover-tooltip rows this chart ever has to place. */
function declutterY<T extends { y: number }>(items: T[], minGap: number): T[] {
  const sorted = [...items].sort((a, b) => a.y - b.y)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].y - sorted[i - 1].y < minGap) sorted[i].y = sorted[i - 1].y + minGap
  }
  return sorted
}

/**
 * The Comparison page's own multi-area trend chart — deliberately a
 * separate component from the shared TrendChart (Dashboard's single-series
 * charts), rather than an extension of it, so this chart's Comparison-only
 * features (actual/change toggle, right-edge end labels, hover guide +
 * all-series tooltip) can't change TrendChart's behavior for Dashboard.
 */
export function ComparisonTrendChart({ series, mode, selectedYear, language, t, height = 300 }: ComparisonTrendChartProps) {
  const { ref, width } = useChartWidth(700)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const years = series[0]?.points.map((p) => p.year) ?? []
  const plotWidth = width - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const stepX = years.length > 1 ? plotWidth / (years.length - 1) : 0
  const xAt = (index: number) => MARGIN.left + index * stepX

  // In "change" mode every series is re-based to 0 at its own first point —
  // never the globally selected year's value, so the baseline stays 2017
  // regardless of which year is currently picked elsewhere on the page.
  const displaySeries = series.map((s) => {
    const base = s.points[0]?.value ?? null
    return {
      ...s,
      points:
        mode === 'actual'
          ? s.points
          : s.points.map((p) => ({ year: p.year, value: p.value === null || base === null ? null : round1(p.value - base) })),
    }
  })

  const allValues = displaySeries.flatMap((s) => s.points.map((p) => p.value))
  const axis = mode === 'actual' ? computeTrendYAxis(allValues) : computeSignedAxis(allValues)
  const yRange = Math.max(axis.max - axis.min, 0.001)
  const yAt = (value: number) => MARGIN.top + plotHeight - ((value - axis.min) / yRange) * plotHeight

  const formatValue = (value: number) => (mode === 'actual' ? formatPct(value) : formatChange(value, t.dashboard.trend.pointsAbbrev))

  const selectedIndex = years.findIndex((y) => y === selectedYear)
  const labeledYearIndices = new Set(pickLabelIndices(years.length, plotWidth))
  const hasAnyData = displaySeries.some((s) => s.points.some((p) => p.value !== null))

  // Right-edge end labels: name + value AT THE SELECTED YEAR (not
  // necessarily the chart's last column), anchored to the chart's right
  // edge for a stable layout as the Year-shown picker changes elsewhere.
  const endLabelCandidates = displaySeries
    .map((s) => {
      const value = selectedIndex >= 0 ? s.points[selectedIndex].value : null
      if (value === null) return null
      return { id: s.id, label: s.label, color: s.color, value, y: yAt(value) }
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
  const endLabels = declutterY(endLabelCandidates, END_LABEL_MIN_GAP)

  const hoverRows =
    hoverIndex !== null
      ? displaySeries.map((s) => ({ id: s.id, label: s.label, color: s.color, value: s.points[hoverIndex].value }))
      : []
  // Near the right edge, the end labels already occupy that space — anchor
  // the tooltip's right edge to the guide line instead of centering it, so
  // the two never overlap.
  const nearRightEdge = hoverIndex !== null && xAt(hoverIndex) > width - MARGIN.right - 130
  const tooltipLeft = hoverIndex !== null ? (nearRightEdge ? xAt(hoverIndex) - 8 : Math.max(xAt(hoverIndex), 90)) : 0

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {series.map((s) => (
          <span key={s.id} className="flex items-center gap-1 text-[10.5px] font-semibold text-slate">
            <span className="h-2 w-2 flex-none rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div ref={ref} className="relative w-full min-w-0">
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ fontFamily: 'inherit' }}>
          {!hasAnyData ? (
            <text x={width / 2} y={height / 2} textAnchor="middle" fontSize="12" fill="var(--color-mist)">
              {t.common.noData}
            </text>
          ) : (
            <>
              {axis.ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={MARGIN.left}
                    x2={width - MARGIN.right}
                    y1={yAt(tick)}
                    y2={yAt(tick)}
                    stroke={mode === 'change' && tick === 0 ? 'var(--color-mist-2)' : 'var(--color-line)'}
                    strokeWidth={mode === 'change' && tick === 0 ? 1.5 : 1}
                  />
                  <text x={MARGIN.left - 6} y={yAt(tick) + 3} textAnchor="end" fontSize="12" fill="var(--color-mist)">
                    {tick}
                    {mode === 'actual' ? '%' : ''}
                  </text>
                </g>
              ))}

              {years.map((y, index) => {
                if (!labeledYearIndices.has(index)) return null
                return (
                  <text key={y} x={xAt(index)} y={height - 6} textAnchor="middle" fontSize="12" fill="var(--color-mist)">
                    {formatYear(y, language)}
                  </text>
                )
              })}

              {selectedIndex >= 0 && (
                <line
                  x1={xAt(selectedIndex)}
                  x2={xAt(selectedIndex)}
                  y1={MARGIN.top}
                  y2={height - MARGIN.bottom}
                  stroke="var(--color-mist-2)"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}

              {displaySeries.map((s) => {
                const segments: { x: number; y: number }[][] = []
                let current: { x: number; y: number }[] = []
                s.points.forEach((p, index) => {
                  if (p.value === null) {
                    if (current.length) segments.push(current)
                    current = []
                  } else {
                    current.push({ x: xAt(index), y: yAt(p.value) })
                  }
                })
                if (current.length) segments.push(current)

                return (
                  <g key={s.id}>
                    {segments.map((segment, segIndex) => (
                      <polyline
                        key={segIndex}
                        points={segment.map((p) => `${p.x},${p.y}`).join(' ')}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ))}
                    {s.points.map((p, index) =>
                      p.value === null ? null : (
                        <circle
                          key={p.year}
                          cx={xAt(index)}
                          cy={yAt(p.value)}
                          r={index === hoverIndex ? 5 : index === selectedIndex ? 4 : 2.5}
                          fill={index === hoverIndex || index === selectedIndex ? '#fff' : s.color}
                          stroke={s.color}
                          strokeWidth={index === hoverIndex || index === selectedIndex ? 2.5 : 0}
                          opacity={index === hoverIndex || index === selectedIndex ? 1 : 0.6}
                        />
                      ),
                    )}
                  </g>
                )
              })}

              {hoverIndex !== null && (
                <line
                  x1={xAt(hoverIndex)}
                  x2={xAt(hoverIndex)}
                  y1={MARGIN.top}
                  y2={height - MARGIN.bottom}
                  stroke="var(--color-ink)"
                  strokeWidth={1}
                  strokeOpacity={0.3}
                />
              )}

              {endLabels.map((l) => (
                <text key={l.id} x={xAt(years.length - 1) + 8} y={l.y + 3} fontSize="11" fontWeight={700} fill={l.color}>
                  {l.label} {formatValue(l.value)}
                </text>
              ))}

              {/* One invisible, full-height hover target per year — hovering
                  anywhere in that year's column sets the guide line/tooltip
                  to it, rather than requiring the pointer to land exactly on
                  a line or point. */}
              <g onMouseLeave={() => setHoverIndex(null)}>
                {years.map((y, index) => (
                  <rect
                    key={y}
                    x={xAt(index) - Math.max(6, stepX / 2 - 1)}
                    y={MARGIN.top}
                    width={Math.max(12, stepX - 2)}
                    height={plotHeight}
                    fill="transparent"
                    onMouseEnter={() => setHoverIndex(index)}
                  />
                ))}
              </g>
            </>
          )}
        </svg>

        {hoverIndex !== null && hoverRows.length > 0 && (
          <div
            className={`pointer-events-none absolute z-10 min-w-[150px] whitespace-nowrap rounded-md border border-line bg-card px-2.5 py-2 text-[11px] shadow-lg ${nearRightEdge ? '-translate-x-full' : '-translate-x-1/2'}`}
            style={{ left: tooltipLeft, top: MARGIN.top }}
          >
            <p className="mb-1 font-semibold text-ink">{formatYear(years[hoverIndex], language)}</p>
            {hoverRows.map((row) => (
              <p key={row.id} className="flex items-center justify-between gap-3 text-slate">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: row.color }} />
                  {row.label}
                </span>
                <span className="font-semibold text-ink tabular-nums">{row.value === null ? t.common.noData : formatValue(row.value)}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      {mode === 'actual' && axis.min > 0 && <p className="mt-1 text-[10px] text-mist">{t.dashboard.trend.axisNote}</p>}
    </div>
  )
}
