type DonutChartProps = {
  /** 0–100 */
  percent: number
  size?: number
  strokeWidth?: number
  color?: string
  trackColor?: string
  centerLabel?: string
  /** Overrides the auto-scaled center font size (size * 0.23 — matches this component's original fixed 26px at the default size=112) — set explicitly where a bigger ring needs a size verified to still fit "100.0%" inside the ring, rather than scaling up by the same ratio. */
  centerFontSize?: number
  subLabel?: string
}

/** The accessibility "ring" used on the map and compare pages. */
export function DonutChart({
  percent,
  size = 112,
  strokeWidth = 10,
  color = 'var(--color-green-600)',
  trackColor = '#E9EEE8',
  centerLabel,
  centerFontSize,
  subLabel,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - Math.min(100, Math.max(0, percent)) / 100)
  const resolvedFontSize = centerFontSize ?? Math.round(size * 0.23)

  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      {(centerLabel || subLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
          {centerLabel && (
            <span
              className="font-bold leading-none text-green-800 tabular-nums"
              style={{ fontSize: resolvedFontSize }}
            >
              {centerLabel}
            </span>
          )}
          {subLabel && <span className="mt-1 text-[10.5px] text-mist">{subLabel}</span>}
        </div>
      )}
    </div>
  )
}
