import type { Language } from './LanguageContext'

/** CE in English, Buddhist Era (CE + 543) in Thai — for prose mentions of a year ("in 2025" / "ในปี 2568"). Chart axis labels stay numeric CE regardless, since they're reflecting the underlying Year data type, not prose. */
export function formatYear(year: number, language: Language): string {
  return String(language === 'th' ? year + 543 : year)
}
