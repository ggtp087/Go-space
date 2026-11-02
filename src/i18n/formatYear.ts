import type { Language } from './LanguageContext'

/** CE in English, Buddhist Era (CE + 543) in Thai — used everywhere a year is displayed (prose, chart axes, tooltips, year pickers). The underlying `Year` values themselves (state, data lookups) always stay CE; only this formatted display text switches. */
export function formatYear(year: number, language: Language): string {
  return String(language === 'th' ? year + 543 : year)
}
