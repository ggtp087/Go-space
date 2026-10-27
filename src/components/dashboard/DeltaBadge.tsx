type DeltaBadgeProps = {
  /** Already in percentage points — never percent change. */
  delta: number
  noChangeLabel: string
  /** Appended after the value, e.g. "pts vs. previous year" or "vs. reference". */
  suffix?: string
  /** Compact form for a table cell / tight column: just the arrow + value, no suffix text. */
  compact?: boolean
}

/**
 * ▲/▼/– in percentage points, with the ▲ green / ▼ orange / – neutral
 * convention used everywhere a change is shown (Dashboard's trend summaries
 * and Δ column, Compare's gap vs. reference) — the one place this
 * formatting lives, so nothing re-implements it.
 */
export function DeltaBadge({ delta, noChangeLabel, suffix, compact = false }: DeltaBadgeProps) {
  const rounded = Math.round(delta * 10) / 10

  if (Math.abs(rounded) < 0.05) {
    if (compact) return <span className="text-mist">–</span>
    return (
      <span className="text-slate">
        – {noChangeLabel}
        {suffix ? ` ${suffix}` : ''}
      </span>
    )
  }

  const isUp = rounded > 0
  return (
    <span className={isUp ? 'font-semibold text-green-700' : 'font-semibold text-accent-600'}>
      {isUp ? '▲' : '▼'} {isUp ? '+' : ''}
      {rounded}
      {!compact && suffix ? ` ${suffix}` : ''}
    </span>
  )
}
