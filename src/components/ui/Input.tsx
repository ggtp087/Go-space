import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  icon?: ReactNode
  /** Renders an eye/eye-off toggle for `type="password"` fields. */
  showPasswordToggle?: boolean
  error?: string
}

export function Input({
  label,
  icon,
  showPasswordToggle = false,
  error,
  id,
  type = 'text',
  className = '',
  ...rest
}: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const resolvedType = isPassword && showPasswordToggle ? (revealed ? 'text' : 'password') : type

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-[12.5px] font-semibold text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && <span className="absolute left-[13px] top-1/2 -translate-y-1/2 text-mist">{icon}</span>}
        <input
          {...rest}
          id={inputId}
          type={resolvedType}
          className={`h-11 w-full rounded-[9px] border-[1.5px] text-[14px] text-ink outline-none placeholder:text-[#A9B4AC] focus:border-green-600 disabled:cursor-not-allowed disabled:border-line-2 disabled:bg-bg disabled:text-slate ${
            error ? 'border-red-400' : 'border-line-2'
          } ${icon ? 'pl-10' : 'pl-3.5'} ${isPassword && showPasswordToggle ? 'pr-10' : 'pr-3.5'}`}
        />
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            aria-label={revealed ? 'Hide password' : 'Show password'}
            className="absolute right-[13px] top-1/2 -translate-y-1/2 border-none bg-transparent p-0 text-mist"
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-red-500">{error}</p>}
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.6 18.6 0 0 1 4.22-5.19M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
