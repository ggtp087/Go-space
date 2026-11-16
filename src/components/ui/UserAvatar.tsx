import { useLanguage } from '../../i18n/LanguageContext'
import { getInitials, type PersonNames } from '../../i18n/personName'

/** Round initials badge for the signed-in user — initials follow the UI language ("นป" / "NP"). */
export function UserAvatar({ names, size = 30 }: { names: PersonNames; size?: number }) {
  const { language } = useLanguage()
  return (
    <span
      aria-hidden="true"
      className="flex flex-none items-center justify-center rounded-full bg-accent-500 font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
    >
      {getInitials(names, language)}
    </span>
  )
}
