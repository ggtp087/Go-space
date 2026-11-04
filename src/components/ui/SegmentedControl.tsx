export type SegmentedOption = {
  value: string
  label: string
  disabled?: boolean
  /** Tooltip shown on the disabled option, explaining why it can't be picked. */
  title?: string
}

type SegmentedControlProps = {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  className?: string
  /** Each button sizes to its own label (and never wraps) instead of stretching to share equal width — for a control whose options have very different label lengths, e.g. the map's basemap switcher ("GIS" vs. "Street map"), where equal-width stretching was squeezing the two-word option onto two lines. */
  fitContent?: boolean
}

export function SegmentedControl({ options, value, onChange, className = '', fitContent = false }: SegmentedControlProps) {
  return (
    <div className={`flex rounded-lg border border-line bg-bg p-0.5 ${className}`}>
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => !option.disabled && onChange(option.value)}
            aria-pressed={isActive}
            disabled={option.disabled}
            title={option.title}
            className={`${fitContent ? 'flex-none whitespace-nowrap' : 'flex-1'} rounded-md px-3.5 py-[7px] text-[12.5px] font-semibold transition-colors ${
              option.disabled
                ? 'cursor-not-allowed text-mist-2'
                : isActive
                  ? 'bg-white text-green-700 shadow-[0_1px_2px_rgba(15,46,34,0.12)]'
                  : 'text-slate'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
