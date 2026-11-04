import type { Language } from './LanguageContext'

const SQM_UNIT: Record<Language, string> = { en: 'm²', th: 'ตร.ม.' }
const SQKM_UNIT: Record<Language, string> = { en: 'km²', th: 'ตร.กม.' }

export function sqmToSqKm(sqm: number): number {
  return sqm / 1_000_000
}

/** A single OPS site's own area — m², rounded, thousands-grouped (e.g. a park's footprint). */
export function formatAreaSqm(sqm: number, language: Language): string {
  return `${Math.round(sqm).toLocaleString()} ${SQM_UNIT[language]}`
}

/** An aggregated or derived area (a sub-district/district/city total, or a service area) — km², 2 decimals. */
export function formatAreaSqKm(sqm: number, language: Language): string {
  return `${sqmToSqKm(sqm).toFixed(2)} ${SQKM_UNIT[language]}`
}
