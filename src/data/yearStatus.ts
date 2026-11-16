import { getAvailableYears, getLatestYearWithResults, isApiYearPending } from './api/store'
import type { Year } from './years'

/**
 * True for a year that exists (it's in the year list and selectable) but has
 * no population results yet — 2026 until its civil-registration figures are
 * loaded. Pages show a "pending registry data" state for it instead of
 * numbers; never zeros.
 */
export function isPendingYear(year: Year): boolean {
  return isApiYearPending(year)
}

/** The year the app opens on: the latest year with results, from /api/years (falls back to the last analysis year). */
export function getInitialYear(): Year {
  const years = getAvailableYears()
  return getLatestYearWithResults() ?? years[years.length - 1]
}
