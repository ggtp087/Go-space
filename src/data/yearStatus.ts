import { defaultYear, type Year } from '../mock/years'
import { getApiLatestYearWithResults, isApiYearPending } from './api/store'
import { isApiMode } from './dataSource'

/**
 * True for a year that exists (it's in the year list and selectable) but has
 * no population results yet — 2026 until its civil-registration figures are
 * loaded. Pages show a "pending registry data" state for it instead of
 * numbers; never zeros. Always false for the mock data.
 */
export function isPendingYear(year: Year): boolean {
  return isApiMode && isApiYearPending(year)
}

/** The year the app opens on: the latest year with results in api mode (from /api/years), the mock's default otherwise. */
export function getInitialYear(): Year {
  if (isApiMode) return getApiLatestYearWithResults() ?? defaultYear
  return defaultYear
}
