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
}

export function SegmentedControl({ options, value, onChange, className = '' }: SegmentedControlProps) {
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
            className={`flex-1 rounded-md px-3.5 py-[7px] text-[12.5px] font-semibold transition-colors ${
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
