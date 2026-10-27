import type { Year } from '../../mock/years'

export type TrendChartPoint = { year: Year; value: number | null }

type TrendChartProps = {
  points: TrendChartPoint[]
  /** One or more years to highlight with a guide line, a larger point, and its value called out. */
  selectedYears: Year[]
  /** Fixed axis top (e.g. 100 for a 0–100% metric) — pass computeNiceAxis(values).max for a metric with no natural ceiling. */
  yMax: number
  yTicks: number[]
  unit?: string
  color?: string
  height?: number
  formatValue?: (value: number) => string
  noDataLabel?: string
}

const VIEW_WIDTH = 640
const MARGIN = { top: 30, right: 14, bottom: 22, left: 38 }

/**
 * A full-axis trend chart (gridlines, every year labeled, one or more
 * highlighted years each with a guide line and its value called out, hover
 * tooltips on every point) — bigger and more detailed than the sparkline
 * TrendLine component used elsewhere.
 */
export function TrendChart({
  points,
  selectedYears,
  yMax,
  yTicks,
  unit = '%',
  color = 'var(--color-green-600)',
  height = 220,
  formatValue = (value) => String(Math.round(value * 10) / 10),
  noDataLabel = 'No data',
}: TrendChartProps) {
  const plotWidth = VIEW_WIDTH - MARGIN.left - MARGIN.right
  const plotHeight = height - MARGIN.top - MARGIN.bottom
  const stepX = points.length > 1 ? plotWidth / (points.length - 1) : 0

  const xAt = (index: number) => MARGIN.left + index * stepX
  const yAt = (value: number) => MARGIN.top + plotHeight - (value / yMax) * plotHeight

  const coords = points.map((point, index) => ({
    year: point.year,
    x: xAt(index),
    y: point.value === null ? null : yAt(point.value),
    value: point.value,
  }))

  // Break the line into contiguous segments so gaps (missing years) show as a visual break.
  const segments: { x: number; y: number }[][] = []
  let current: { x: number; y: number }[] = []
  for (const c of coords) {
    if (c.y === null) {
      if (current.length) segments.push(current)
      current = []
    } else {
      current.push({ x: c.x, y: c.y })
    }
  }
  if (current.length) segments.push(current)

  const hasAnyData = coords.some((c) => c.value !== null)
  const selectedCoords = coords.filter((c) => selectedYears.includes(c.year))

  return (
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

          {points.map((point, index) => (
            <text key={point.year} x={xAt(index)} y={height - 6} textAnchor="middle" fontSize="9.5" fill="var(--color-mist)">
              {point.year}
            </text>
          ))}

          {selectedCoords.map((c) => (
            <line
              key={c.year}
              x1={c.x}
              x2={c.x}
              y1={MARGIN.top}
              y2={height - MARGIN.bottom}
              stroke="var(--color-mist-2)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          ))}

          {segments.map((segment, index) => (
            <polyline
              key={index}
              points={segment.map((p) => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {coords.map((c) =>
            c.value === null || c.y === null ? (
              <circle key={c.year} cx={c.x} cy={height - MARGIN.bottom} r={2} fill="var(--color-mist-2)">
                <title>
                  {c.year}: {noDataLabel}
                </title>
              </circle>
            ) : selectedYears.includes(c.year) ? (
              <circle key={c.year} cx={c.x} cy={c.y} r={4.5} fill="#fff" stroke={color} strokeWidth={2.5}>
                <title>
                  {c.year}: {formatValue(c.value)}
                  {unit}
                </title>
              </circle>
            ) : (
              <circle key={c.year} cx={c.x} cy={c.y} r={2.5} fill={color} opacity={0.55}>
                <title>
                  {c.year}: {formatValue(c.value)}
                  {unit}
                </title>
              </circle>
            ),
          )}

          {selectedCoords.map(
            (c) =>
              c.value !== null &&
              c.y !== null && (
                <text
                  key={c.year}
                  x={c.x}
                  y={c.y - 10}
                  textAnchor={c.x < 50 ? 'start' : c.x > VIEW_WIDTH - 50 ? 'end' : 'middle'}
                  fontSize="12"
                  fontWeight={700}
                  fill={color}
                >
                  {formatValue(c.value)}
                  {unit}
                </text>
              ),
          )}
        </>
      )}
    </svg>
  )
}
