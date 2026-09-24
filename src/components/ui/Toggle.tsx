type ToggleProps = {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

/** A small pill switch — used for map layer visibility, settings, etc. */
export function Toggle({ checked, onChange, label, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative h-[19px] w-[34px] flex-none rounded-full border-none p-0 transition-colors disabled:opacity-50 ${
        checked ? 'bg-green-600' : 'bg-line-2'
      }`}
    >
      <span
        className={`absolute top-[2px] h-[15px] w-[15px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.25)] transition-[left] ${
          checked ? 'left-[17px]' : 'left-[2px]'
        }`}
      />
    </button>
  )
}
