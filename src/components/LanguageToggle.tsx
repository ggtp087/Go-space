import { useLanguage, type Language } from '../i18n/LanguageContext'
import { en } from '../i18n/strings'

type LanguageToggleProps = {
  /** `dark` sits on the green navbar; `light` sits on a white surface. */
  variant?: 'dark' | 'light'
  className?: string
}

const OPTIONS: { value: Language; label: string }[] = [
  { value: 'en', label: en.lang.en },
  { value: 'th', label: en.lang.th },
]

export function LanguageToggle({ variant = 'dark', className = '' }: LanguageToggleProps) {
  const { language, setLanguage } = useLanguage()
  const trackClass = variant === 'dark' ? 'bg-white/8' : 'bg-bg'

  return (
    <div className={`flex rounded-lg p-0.5 ${trackClass} ${className}`}>
      {OPTIONS.map((option) => {
        const isActive = option.value === language
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setLanguage(option.value)}
            aria-pressed={isActive}
            className={`rounded-md px-2.5 py-[5px] text-xs font-semibold transition-colors ${
              isActive
                ? variant === 'dark'
                  ? 'bg-white text-green-800'
                  : 'bg-white text-green-800 shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                : variant === 'dark'
                  ? 'text-[#CFE3D6] hover:text-white'
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
