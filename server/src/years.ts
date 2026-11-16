import { query } from './db.js'
import { HttpError } from './validate.js'

export type YearInfo = {
  year: number
  analysis_id: number
  population_year: number
  /** null when the analysis has no assessment yet. */
  assessment_id: number | null
  result_count: number
  /** 'pending' = the analysis exists but has no sub-district results yet (e.g. 2026 before registry data). */
  status: 'ok' | 'pending'
}

/**
 * Every analysis year with its assessment and result count. The UI year is
 * analysis.analysis_year; sub-district results hang off it via
 * assessment_results → assessments → analysis. Neither analysis_year nor
 * assessments.analysis_id is declared UNIQUE in the schema, so this refuses
 * to answer (instead of silently double-counting) if either ever repeats.
 */
export async function loadYears(): Promise<YearInfo[]> {
  const rows = await query<{
    year: number
    analysis_id: number
    population_year: number
    assessment_ids: number[]
    result_count: number
  }>(
    'years',
    `select an.analysis_year as year, an.analysis_id, an.population_year,
            coalesce(array_agg(distinct a.assessment_id) filter (where a.assessment_id is not null), '{}') as assessment_ids,
            count(ar.result_id)::int as result_count
       from spatial.analysis an
       left join spatial.assessments a on a.analysis_id = an.analysis_id
       left join spatial.assessment_results ar on ar.assessment_id = a.assessment_id
      group by an.analysis_id
      order by an.analysis_year`,
  )

  const seen = new Set<number>()
  for (const row of rows) {
    if (seen.has(row.year)) throw new HttpError(500, `Data integrity: more than one analysis for year ${row.year}`)
    seen.add(row.year)
    if (row.assessment_ids.length > 1) throw new HttpError(500, `Data integrity: more than one assessment for analysis ${row.analysis_id} (${row.year})`)
  }

  return rows.map((row) => ({
    year: row.year,
    analysis_id: row.analysis_id,
    population_year: row.population_year,
    assessment_id: row.assessment_ids[0] ?? null,
    result_count: row.result_count,
    status: row.result_count > 0 ? 'ok' : 'pending',
  }))
}

/** The analysis for a requested year — 400 if the year has no analysis at all. */
export async function resolveYear(year: number): Promise<YearInfo> {
  const years = await loadYears()
  const info = years.find((y) => y.year === year)
  if (!info) throw new HttpError(400, `year must be one of: ${years.map((y) => y.year).join(', ')}`)
  return info
}
