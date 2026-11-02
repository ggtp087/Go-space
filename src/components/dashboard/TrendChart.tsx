import { formatYear } from '../../i18n/formatYear'
import type { Language } from '../../i18n/LanguageContext'
import type { Year } from '../../mock/years'

export type TrendChartPoint = { year: Year; value: number | null }
export type TrendSeries = { points: TrendChartPoint[]; color: string; label?: string }

type TrendChartProps = {
  /** Single-series usage — ignored when `series` is given. */
  points?: TrendChartPoint[]
  color?: string
  /**
   * Multiple overlaid series sharing one axis (e.g. Compare's several
   * areas) — takes precedence over points/color. Adds a small legend and,
   * for every year, a wider hover target whose tooltip lists all series'
   * values that year (per-point tooltips and the always-on value labels
   * are single-series-only, to avoid cluttering an overlay).
   */
  series?: TrendSeries[]
  /** One or more years to highlight with a guide line and a larger point. */
  selectedYears: Year[]
  /** Axis bottom — 0 for a bar-style 0-based axis, or computeTrendYAxis(values).min for a zoomed-in line. */
  yMin?: number
  yMax: number
  yTicks: number[]
  unit?: string
  height?: number
  formatValue?: (value: number) => string
  noDataLabel?: string
  /** Shown below the chart only when yMin > 0, e.g. "Axis does not start at 0" — so a zoomed-in axis is never silently misleading. */
  axisNote?: string
  /** Converts every displayed year (axis labels, tooltips) to Buddhist Era in Thai mode — defaults to English/CE. */
  language?: Language
}

const VIEW_WIDTH = 640
const MARGIN = { top: 30, right: 14, bottom: 22, left: 38 }
const DEFAULT_COLOR = 'var(--color-green-600)'

type SeriesCoord = { year: Year; x: number; y: number | null; value: number | null }

/**
 * A full-axis trend chart (gridlines, every year labeled, one or more
 * highlighted years each with a guide line, hover tooltips, every point
 * value-labeled in single-series mode) — bigger and more detailed than the
 * sparkline TrendLine component used elsewhere. Single-series usage
 * (points/color) is unchanged from before; pass `series` instead for
 * several overlaid lines on the same axis.
 */
export function TrendChart({
  points,
  color,
  series,
  selectedYears,
  yMin = 0,
  yMax,
  yTicks,
  unit = '%',
  height = 220,
  formatValue = (value) => String(Math.round(value * 10) / 10),
  noDataLabel = 'No data',
  axisNote,
  language = 'en',
}: TrendChartProps) {
  const resolvedSeries: TrendSeries[] = series ?? (points ? [{ points, color: color ?? DEFAULT_COLOR }] : [])
  const isMultiSeries = resolvedSeries.length > 1
  const showLegend = isMultiSeries && resolvedSeries.some((s) => s.label)

  const axisPoints = resolvedSeries[0]?.points ?? []
  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const stepX = axisPoints.length > 1 ? plotWidth / (axisPoints.length - 1) : 0
  const yRange = Math.max(yMax - yMin, 0.001)

  const xAt = (index: number) => MARGIN.left + index * stepX
  const yAt = (value: number) => MARGIN.top + plotHeight - ((value - yMin) / yRange) * plotHeight

  const seriesCoords: (TrendSeries & { coords: SeriesCoord[] })[] = resolvedSeries.map((s) => ({
    ...s,
    coords: s.points.map((point, index) => ({
      year: point.year,
      x: xAt(index),
      y: point.value === null ? null : yAt(point.value),
      value: point.value,
    })),
  }))

  const hasAnyData = seriesCoords.some((s) => s.coords.some((c) => c.value !== null))
  const selectedIndexes = selectedYears.map((year) => axisPoints.findIndex((p) => p.year === year)).filter((index) => index >= 0)

  return (
    <div>
      {showLegend && (
        <div className="mb-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {resolvedSeries.map((s, index) => (
            <span key={index} className="flex items-center gap-1 text-[10.5px] font-semibold text-slate">
              <span className="h-2 w-2 flex-none rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      <svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} preserveAspectRatio="none">
        {!hasAnyData ? (
          <text x={VIEW_WIDTH / 2} y={height / 2} textAnchor="middle" fontSize="11" fill="var(--color-mist)">
            {noDataLabel}
          </text>
        ) : (
          <>
            {yTicks.map((tick) => (
              <g key={tick}>
                <line x1={MARGIN.left} x2={VIEW_WIDTH - MARGIN.right} y1={yAt(tick)} y2={yAt(tick)} stroke="var(--color-line)" strokeWidth={1} />
                <text x={MARGIN.left - 6} y={yAt(tick) + 3} textAnchor="end" fontSize="9.5" fill="var(--color-mist)">
                  {tick}
                  {unit}
                </text>
              </g>
            ))}

            {axisPoints.map((point, index) => (
              <text key={point.year} x={xAt(index)} y={height - 6} textAnchor="middle" fontSize="9.5" fill="var(--color-mist)">
                {formatYear(point.year, language)}
              </text>
            ))}

            {selectedIndexes.map((index) => (
              <line
                key={index}
                x1={xAt(index)}
                x2={xAt(index)}
                y1={MARGIN.top}
                y2={height - MARGIN.bottom}
                stroke="var(--color-mist-2)"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            ))}

            {seriesCoords.map((s, sIndex) => {
              const segments: { x: number; y: number }[][] = []
              let current: { x: number; y: number }[] = []
              for (const c of s.coords) {
                if (c.y === null) {
                  if (current.length) segments.push(current)
                  current = []
                } else {
                  current.push({ x: c.x, y: c.y })
                }
              }
              if (current.length) segments.push(current)

              return (
                <g key={sIndex}>
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
                  {s.coords.map((c) =>
                    c.value === null || c.y === null ? (
                      <circle key={c.year} cx={c.x} cy={height - MARGIN.bottom} r={2} fill="var(--color-mist-2)">
                        {!isMultiSeries && (
                          <title>
                            {formatYear(c.year, language)}: {noDataLabel}
                          </title>
                        )}
                      </circle>
                    ) : selectedYears.includes(c.year) ? (
                      <circle key={c.year} cx={c.x} cy={c.y} r={isMultiSeries ? 4 : 4.5} fill="#fff" stroke={s.color} strokeWidth={2.5}>
                        {!isMultiSeries && (
                          <title>
                            {formatYear(c.year, language)}: {formatValue(c.value)}
                            {unit}
                          </title>
                        )}
                      </circle>
                    ) : (
                      <circle key={c.year} cx={c.x} cy={c.y} r={2.5} fill={s.color} opacity={0.55}>
                        {!isMultiSeries && (
                          <title>
                            {formatYear(c.year, language)}: {formatValue(c.value)}
                            {unit}
                          </title>
                        )}
                      </circle>
                    ),
                  )}
                </g>
              )
            })}

            {/* Every point value-labeled in single-series mode — alternating
                above/below by index so adjacent labels don't collide; the
                selected year(s) get a larger, bolder, fully-opaque label. */}
            {!isMultiSeries &&
              seriesCoords[0] &&
              seriesCoords[0].coords.map((c, index) => {
                if (c.value === null || c.y === null) return null
                const isSelected = selectedYears.includes(c.year)
                const above = index % 2 === 0
                return (
                  <text
                    key={c.year}
                    x={c.x}
                    y={above ? c.y - (isSelected ? 10 : 7) : c.y + (isSelected ? 16 : 13)}
                    textAnchor={c.x < 50 ? 'start' : c.x > VIEW_WIDTH - 50 ? 'end' : 'middle'}
                    fontSize={isSelected ? 12 : 9}
                    fontWeight={isSelected ? 700 : 600}
                    fill={isSelected ? seriesCoords[0].color : 'var(--color-slate)'}
                    opacity={isSelected ? 1 : 0.85}
                  >
                    {formatValue(c.value)}
                    {unit}
                  </text>
                )
              })}

            {isMultiSeries &&
              axisPoints.map((point, index) => (
                <rect
                  key={point.year}
                  x={xAt(index) - Math.max(6, stepX / 2 - 1)}
                  y={MARGIN.top}
                  width={Math.max(12, stepX - 2)}
                  height={plotHeight}
                  fill="transparent"
                  pointerEvents="all"
                >
                  <title>
                    {[
                      formatYear(point.year, language),
                      ...seriesCoords.map((s) => {
                        const value = s.coords[index].value
                        const valueText = value === null ? noDataLabel : `${formatValue(value)}${unit}`
                        return s.label ? `${s.label}: ${valueText}` : valueText
                      }),
                    ].join('\n')}
                  </title>
                </rect>
              ))}
          </>
        )}
      </svg>
      {axisNote && yMin > 0 && <p className="mt-1 text-[10px] text-mist">{axisNote}</p>}
    </div>
  )
}
