type YearSelectProps<T extends number> = {
  years: readonly T[]
  value: T
  onChange: (year: T) => void
  formatOption?: (year: T) => string
  ariaLabel?: string
  className?: string
}

/** A small pill-shaped year picker — the shared time-dimension control. */
export function YearSelect<T extends number>({
  years,
  value,
  onChange,
  formatOption = String,
  ariaLabel = 'Year',
  className = '',
}: YearSelectProps<T>) {
  return (
    <div className={`relative inline-flex ${className}`}>
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value) as T)}
        aria-label={ariaLabel}
        className="h-9 appearance-none rounded-full border border-line bg-white pl-3.5 pr-8 text-[12.5px] font-semibold text-slate outline-none focus:border-green-600"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {formatOption(year)}
          </option>
        ))}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  )
}
