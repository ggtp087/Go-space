type ChipProps = {
  label: string
  /** Selectable pill (e.g. filter chips): highlighted when true. */
  selected?: boolean
  onSelect?: () => void
  /** Removable pill (e.g. chosen districts to compare): shows a swatch + close button. */
  removable?: boolean
  swatchColor?: string
  onRemove?: () => void
}

export function Chip({ label, selected = false, onSelect, removable = false, swatchColor, onRemove }: ChipProps) {
  if (removable) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-line-2 bg-white py-[7px] pl-3.5 pr-[7px] text-[13px] font-semibold text-ink">
        {swatchColor && <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: swatchColor }} />}
        {label}
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="flex h-5 w-5 flex-none items-center justify-center rounded-full border-none bg-bg text-slate"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`rounded-full border px-[11px] py-[5px] text-xs font-medium transition-colors ${
        selected ? 'border-green-500 bg-green-100 font-semibold text-green-800' : 'border-line-2 bg-white text-slate'
      }`}
    >
      {label}
    </button>
  )
}
