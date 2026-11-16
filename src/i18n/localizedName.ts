import type { Language } from './LanguageContext'

/** Picks a district/sub-district/Bangkok/OPS name in the current UI language — the one place that choice happens. */
export function localizedName(nameEn: string, nameTh: string, language: Language): string {
  return language === 'th' ? nameTh : nameEn
}
