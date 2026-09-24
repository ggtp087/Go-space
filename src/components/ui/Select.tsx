import { useId, type SelectHTMLAttributes } from 'react'

export type SelectOption = {
  value: string
  label: string
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label?: string
  options: SelectOption[]
}

export function Select({ label, options, id, className = '', ...rest }: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-[12.5px] font-semibold text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          {...rest}
          id={selectId}
          className="h-[38px] w-full appearance-none rounded-lg border border-line-2 bg-white pl-3 pr-8 text-[13px] text-ink outline-none focus:border-green-600"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  )
}
