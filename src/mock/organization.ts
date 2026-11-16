import type { Language } from '../i18n/LanguageContext'

// Mock rows of the `departments` and `positions` lookup tables. Forms store
// the `id`; the name shown is name_th or name_en for the current language.
export type LookupRow = { id: string; name_en: string; name_th: string }

export const departments: readonly LookupRow[] = [
  { id: 'city-planning', name_en: 'City Planning & Urban Development', name_th: 'สำนักการวางผังและพัฒนาเมือง' },
  { id: 'environment', name_en: 'Environment', name_th: 'สำนักสิ่งแวดล้อม' },
  { id: 'public-works', name_en: 'Public Works', name_th: 'สำนักการโยธา' },
  { id: 'traffic', name_en: 'Traffic & Transportation', name_th: 'สำนักการจราจรและขนส่ง' },
]

export const positions: readonly LookupRow[] = [
  { id: 'urban-planner', name_en: 'Urban Planner', name_th: 'นักผังเมือง' },
  { id: 'gis-analyst', name_en: 'GIS Analyst', name_th: 'นักวิเคราะห์ข้อมูลภูมิสารสนเทศ' },
  { id: 'policy-officer', name_en: 'Policy Officer', name_th: 'นักวิเคราะห์นโยบายและแผน' },
  { id: 'administrator', name_en: 'Administrator', name_th: 'ผู้ดูแลระบบ' },
]

/** A lookup row's name in the given language; the id itself if it isn't found. */
export function lookupName(rows: readonly LookupRow[], id: string, language: Language): string {
  const row = rows.find((r) => r.id === id)
  if (!row) return id
  return language === 'th' ? row.name_th : row.name_en
}

/** Select options: value = id (what's stored), label = current language's name. */
export function lookupOptions(rows: readonly LookupRow[], language: Language): { value: string; label: string }[] {
  return rows.map((row) => ({ value: row.id, label: language === 'th' ? row.name_th : row.name_en }))
}
