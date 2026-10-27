import type { Year } from '../../mock/years'

type SparklinePoint = { year: Year; value: number | null }

type SparklineProps = {
  points: SparklinePoint[]
  selectedYear: Year
  width?: number
  height?: number
  color?: string
}

/** A tiny inline trend indicator for a table row — not sortable, purely decorative context next to the Δ column. */
export function Sparkline({ points, selectedYear, width = 80, height = 20, color = 'var(--color-green-600)' }: SparklineProps) {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null)
  if (values.length === 0) return <svg width={width} height={height} />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = Math.max(max - min, 0.001)
  const padding = 2
  const plotHeight = height - padding * 2
  const stepX = points.length > 1 ? width / (points.length - 1) : 0

  const coords = points.map((point, index) => ({
    year: point.year,
    x: index * stepX,
    y: point.value === null ? null : padding + plotHeight - ((point.value - min) / span) * plotHeight,
  }))
  const linePoints = coords.filter((c): c is { year: Year; x: number; y: number } => c.y !== null)

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={linePoints.map((c) => `${c.x},${c.y}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {linePoints
        .filter((c) => c.year === selectedYear)
        .map((c) => (
          <circle key={c.year} cx={c.x} cy={c.y} r={2.5} fill="#fff" stroke={color} strokeWidth={1.5} />
        ))}
    </svg>
  )
}
