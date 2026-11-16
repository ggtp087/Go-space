import { availableYears, type Year } from '../../mock/years'
import { apiGet, type ApiResultRow, type ApiResultsResponse, type ApiYear, type ApiYearsResponse } from './client'

// Results for every year and level, loaded once before the app renders in
// api mode (≈2,000 small rows). Map/Dashboard/Comparison then read them
// synchronously through mock/assessmentResults.ts's existing helpers, so the
// pages don't need to know where the numbers came from. District and Bangkok
// rows are the server's SQL sums — never re-aggregated here.

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
  yearInfo = years.years
  latestYearWithResults = (years.latest_year_with_results as Year | null) ?? null

  const apiYears = years.years.map((y) => y.year)
  const expected = availableYears as readonly number[]
  if (apiYears.length !== expected.length || apiYears.some((y, i) => y !== expected[i])) {
    console.error(`[api] analysis years ${apiYears.join(', ')} differ from the app's year list ${expected.join(', ')}`)
  }

  const okYears = years.years.filter((y) => y.status === 'ok').map((y) => y.year)
  const responses = await Promise.all(
    okYears.flatMap((year) => LEVELS.map((level) => apiGet<ApiResultsResponse>('results', { year, level }))),
  )
  for (const response of responses) {
    for (const row of response.rows) {
      const { id, ...stats } = row
      resultsByKey.set(key(id, response.year), stats)
    }
  }
}

/** A sub-district's, district's, or Bangkok's result for the year; undefined while the year is pending. */
export function getApiResult(areaId: string, year: number): StoredResult | undefined {
  return resultsByKey.get(key(areaId, year))
}

export function isApiYearPending(year: number): boolean {
  return yearInfo.find((y) => y.year === year)?.status === 'pending'
}

export function getApiLatestYearWithResults(): Year | null {
  return latestYearWithResults
}
