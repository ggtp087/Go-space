import { useLanguage } from '../../i18n/LanguageContext'

type ChipProps = {
  label: string
  /** Selectable pill (e.g. filter chips): highlighted when true. */
  selected?: boolean
  onSelect?: () => void
  /** Removable pill (e.g. chosen districts to compare): shows a swatch + close button. */
  removable?: boolean
  swatchColor?: string
  onRemove?: () => void
  /** Small star toggle inside a removable chip — filled when this chip is the current reference, outline otherwise; click sets it as reference. `label` doubles as the tooltip/aria-label. */
  reference?: { isReference: boolean; onSetReference: () => void; label: string }
}

export function Chip({ label, selected = false, onSelect, removable = false, swatchColor, onRemove, reference }: ChipProps) {
  const { t } = useLanguage()
  if (removable) {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border-[1.5px] border-line-2 bg-white py-[7px] pl-3.5 pr-[7px] text-[13px] font-semibold text-ink">
        {swatchColor && <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: swatchColor }} />}
        {label}
        {reference && (
          <button
            type="button"
            onClick={reference.onSetReference}
            aria-label={reference.label}
            title={reference.label}
            aria-pressed={reference.isReference}
            className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-none bg-transparent ${
              reference.isReference ? 'text-accent-600' : 'text-mist-2 hover:text-slate'
            }`}
          >
            <StarIcon filled={reference.isReference} />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={t.common.removeItem.replace('{item}', label)}
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
      className={`inline-flex items-center gap-1.5 rounded-full border px-[11px] py-[5px] text-xs font-medium transition-colors ${
        selected ? 'border-green-500 bg-green-100 font-semibold text-green-800' : 'border-line-2 bg-white text-slate'
      }`}
    >
      {swatchColor && <span className="h-2 w-2 flex-none rounded-full" style={{ background: swatchColor }} />}
      {label}
    </button>
  )
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={filled ? 0 : 1.8} strokeLinejoin="round">
      <path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.6l-5.9 3.1 1.3-6.6-4.9-4.6 6.6-.8z" />
    </svg>
  )
}
