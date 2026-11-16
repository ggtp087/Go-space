import { apiGet, type ApiDepartment, type ApiPosition } from './api/client'
import { createResourceCache, useResource, type ResourceState } from './resource'
import type { Language } from '../i18n/LanguageContext'

// The departments and positions lookup tables (app schema). Fetched once and
// kept; forms store the numeric id, and the name shown follows the UI language.

export type LookupRow = { id: number; name_en: string; name_th: string }

const lookups = createResourceCache<LookupRow[]>(async (key) => {
  if (key === 'departments') {
    const rows = await apiGet<ApiDepartment[]>('departments')
    return rows.map((row) => ({ id: row.department_id, name_en: row.name_en, name_th: row.name_th }))
  }
  const rows = await apiGet<ApiPosition[]>('positions')
  return rows.map((row) => ({ id: row.position_id, name_en: row.name_en, name_th: row.name_th }))
})

export function useDepartments(): ResourceState<LookupRow[]> {
  return useResource(lookups, 'departments')
}

export function usePositions(): ResourceState<LookupRow[]> {
  return useResource(lookups, 'positions')
}

/** A lookup row's name in the given language; empty while the rows are loading or if the id isn't found. */
export function lookupName(rows: readonly LookupRow[] | undefined, id: number, language: Language): string {
  const row = rows?.find((r) => r.id === id)
  if (!row) return ''
  return language === 'th' ? row.name_th : row.name_en
}

/** Select options: value = id (as a string, what <select> holds), label = the current language's name. */
export function lookupOptions(rows: readonly LookupRow[], language: Language): { value: string; label: string }[] {
  return rows.map((row) => ({ value: String(row.id), label: language === 'th' ? row.name_th : row.name_en }))
}
