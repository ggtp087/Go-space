type ProgressBarProps = {
  /** 0–100 */
  value: number
  label?: string
  valueLabel?: string
  color?: string
  size?: 'sm' | 'md'
}

export function ProgressBar({ value, label, valueLabel, color = 'var(--color-green-600)', size = 'md' }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  const trackHeight = size === 'sm' ? 'h-1.5' : 'h-[7px]'

  return (
    <div>
      {(label || valueLabel) && (
        <div className="mb-[5px] flex items-center justify-between text-[12.5px]">
          {label && <span className="text-slate">{label}</span>}
          {valueLabel && <span className="font-bold tabular-nums text-ink">{valueLabel}</span>}
        </div>
      )}
      <div className={`${trackHeight} rounded-full bg-bg`}>
        <div className={`${trackHeight} rounded-full`} style={{ width: `${clamped}%`, background: color }} />
      </div>
    </div>
  )
}
