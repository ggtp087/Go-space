export type TrendPoint = {
  year: number
  value: number | null
}

type TrendLineProps = {
  points: TrendPoint[]
  /** Years to draw as a highlighted dot (e.g. the years selected for comparison). */
  highlightYears?: number[]
  height?: number
  color?: string
  unit?: string
  showAxisLabels?: boolean
  noDataLabel?: string
  className?: string
}

const VIEW_WIDTH = 300

/** A small line chart / sparkline for one metric across the sample years. */
export function TrendLine({
  points,
  highlightYears = [],
  height = 56,
  color = 'var(--color-green-600)',
  unit = '%',
  showAxisLabels = false,
  noDataLabel = 'No data',
  className = '',
}: TrendLineProps) {
  const padTop = showAxisLabels ? 16 : 6
  const padBottom = showAxisLabels ? 16 : 6
  const plotHeight = height - padTop - padBottom

  // Pad the y-domain so a genuinely flat/near-flat series doesn't get
  // stretched into a dramatic zigzag by fitting tightly to its own min/max.
  const MIN_VISUAL_RANGE = 12
  const values = points.map((p) => p.value).filter((v): v is number => v !== null)
  const rawMin = values.length ? Math.min(...values) : 0
  const rawMax = values.length ? Math.max(...values) : 100
  const midpoint = (rawMin + rawMax) / 2
  const span = Math.max(rawMax - rawMin, MIN_VISUAL_RANGE)
  const minValue = midpoint - span / 2
  const range = span

  const stepX = points.length > 1 ? VIEW_WIDTH / (points.length - 1) : 0
  const coords = points.map((point, index) => ({
    ...point,
    x: index * stepX,
    y: point.value === null ? null : padTop + plotHeight - ((point.value - minValue) / range) * plotHeight,
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

  const hasAnyData = values.length > 0

  return (
    <div className={className}>
      <svg width="100%" height={height} viewBox={`0 0 ${VIEW_WIDTH} ${height}`} preserveAspectRatio="none">
        {!hasAnyData ? (
          <text x={VIEW_WIDTH / 2} y={height / 2} textAnchor="middle" fontSize="10" fill="var(--color-mist)">
            {noDataLabel}
          </text>
        ) : (
          <>
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
              c.y === null ? (
                <circle key={c.year} cx={c.x} cy={height - padBottom} r={2} fill="var(--color-mist-2)">
                  <title>
                    {noDataLabel} ({c.year})
                  </title>
                </circle>
              ) : highlightYears.includes(c.year) ? (
                <circle key={c.year} cx={c.x} cy={c.y} r={3.5} fill="#fff" stroke={color} strokeWidth={2}>
                  <title>
                    {c.year}: {c.value}
                    {unit}
                  </title>
                </circle>
              ) : (
                <circle key={c.year} cx={c.x} cy={c.y} r={2} fill={color} opacity={0.5}>
                  <title>
                    {c.year}: {c.value}
                    {unit}
                  </title>
                </circle>
              ),
            )}
          </>
        )}
      </svg>
      {showAxisLabels && (
        <div className="mt-1 flex justify-between text-[10px] font-semibold text-mist">
          <span>{points[0]?.year}</span>
          <span>{points[points.length - 1]?.year}</span>
        </div>
      )}
    </div>
  )
}
