import type { Year } from '../years'
import { apiGet, type ApiResultRow, type ApiResultsResponse, type ApiYear, type ApiYearsResponse } from './client'

// Results for every year and level, loaded once before the app renders
// (≈2,000 small rows). Map/Dashboard/Comparison then read them
// synchronously through data/results.ts. District and Bangkok rows are the
// server's SQL sums — never re-aggregated here. If this load fails the app
// shows an error with a retry button (main.tsx); there is no fallback data.

type StoredResult = Omit<ApiResultRow, 'id' | 'name_en' | 'name_th' | 'parent_id'>

const resultsByKey = new Map<string, StoredResult>()
let yearInfo: ApiYear[] = []
let latestYearWithResults: Year | null = null

function key(areaId: string, year: number): string {
  return `${areaId}__${year}`
}

const LEVELS = ['subdistrict', 'district', 'bangkok'] as const

export async function loadApiStore(): Promise<void> {
  const years = await apiGet<ApiYearsResponse>('years')
  if (years.years.length === 0) throw new Error('The API returned no analysis years.')

  const okYears = years.years.filter((y) => y.status === 'ok').map((y) => y.year)
  const responses = await Promise.all(
    okYears.flatMap((year) => LEVELS.map((level) => apiGet<ApiResultsResponse>('results', { year, level }))),
  )

  resultsByKey.clear()
  for (const response of responses) {
    for (const row of response.rows) {
      const { id, ...stats } = row
      resultsByKey.set(key(id, response.year), stats)
    }
  }
  yearInfo = years.years
  latestYearWithResults = years.latest_year_with_results
}

/** A sub-district's, district's, or Bangkok's result for the year; undefined while the year is pending. */
export function getApiResult(areaId: string, year: number): StoredResult | undefined {
  return resultsByKey.get(key(areaId, year))
}

/** Every analysis year (spatial.analysis.analysis_year), ascending — pending years included. */
export function getAvailableYears(): Year[] {
  return yearInfo.map((y) => y.year)
}

export function isApiYearPending(year: number): boolean {
  return yearInfo.find((y) => y.year === year)?.status === 'pending'
}

export function getLatestYearWithResults(): Year | null {
  return latestYearWithResults
}
